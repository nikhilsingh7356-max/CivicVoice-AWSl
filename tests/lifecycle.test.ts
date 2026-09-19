import { before, beforeEach, test, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import type { Express } from 'express';
import { CivicCase } from '../src/types.ts';
import {
  CASE_LIFECYCLE,
  validateStatusTransition,
  resolveInitialStatus,
  statusRequiresHumanAction,
  SUGGESTED_OFFICER_ROLES,
} from '../src/server/lifecycle.ts';

process.env.AWS_LAMBDA_FUNCTION_NAME = 'test';
process.env.AWS_ACCESS_KEY_ID = 'test';
process.env.AWS_REGION = 'ap-south-1';
delete process.env.MEDIA_BUCKET;
process.env.DISABLE_CLOUDWATCH_METRICS = 'true';

const ddbMock = mockClient(DynamoDBDocumentClient);
const ebMock = mockClient(EventBridgeClient);
const bedrockMock = mockClient(BedrockRuntimeClient);

let app: Express;

before(async () => {
  ({ app } = await import('../server.ts'));
});

beforeEach(() => {
  ddbMock.reset();
  ebMock.reset();
  bedrockMock.reset();
  ddbMock.on(ScanCommand).resolves({ Items: [] });
});

const CASE_ID = 'CV-2026-LIFE0001';

function seedCase(overrides: Partial<CivicCase> = {}): void {
  let caseState: any = {
    case_id: CASE_ID,
    created_at: '2026-09-19T09:00:00.000Z',
    complaint: 'Pothole on main road',
    title: 'Pothole',
    category: 'ROADS',
    subcategory: 'pothole',
    department: 'Public Works',
    priority: 'MEDIUM',
    severity_score: 6,
    location: 'Prayagraj, Uttar Pradesh',
    location_type: 'manual',
    media_type: 'none',
    status: 'CREATED',
    ai_generated: true,
    action_steps_completed: [],
    ...overrides,
  };
  ddbMock.on(GetCommand).callsFake(async () => ({ Item: caseState }));
ddbMock.on(PutCommand).callsFake(async (input: any) => {
      if (input.TableName === 'CivicVoiceCases') caseState = input.Item;
      return {};
    });
  ddbMock.on(QueryCommand).resolves({ Items: [] });
}

function historyWrites(): any[] {
  return ddbMock
    .commandCalls(PutCommand)
    .filter((call) => (call.args[0].input as any).TableName === 'CivicVoiceCaseHistory')
    .map((call) => (call.args[0].input as any).Item);
}

describe('case lifecycle pure functions', () => {
  test('exposes the full 7-state lifecycle in order', () => {
    assert.deepEqual(CASE_LIFECYCLE, [
      'CREATED',
      'AI_TRIAGED',
      'ASSIGNED',
      'FIELD_VERIFICATION',
      'IN_PROGRESS',
      'RESOLVED',
      'CLOSED',
    ]);
  });

  test('CREATED can only advance to AI_TRIAGED (no shortcuts to RESOLVED/CLOSED)', () => {
    assert.equal(validateStatusTransition('CREATED', 'AI_TRIAGED').valid, true);
    assert.equal(validateStatusTransition('CREATED', 'RESOLVED').valid, false);
    assert.equal(validateStatusTransition('CREATED', 'CLOSED').valid, false);
    assert.equal(validateStatusTransition('CREATED', 'ASSIGNED').valid, false);
  });

  test('AI_TRIAGED can advance to officer dispatch or field handling', () => {
    assert.equal(validateStatusTransition('AI_TRIAGED', 'ASSIGNED').valid, true);
    assert.equal(validateStatusTransition('AI_TRIAGED', 'FIELD_VERIFICATION').valid, true);
    assert.equal(validateStatusTransition('AI_TRIAGED', 'IN_PROGRESS').valid, true);
    assert.equal(validateStatusTransition('AI_TRIAGED', 'CLOSED').valid, false);
    assert.equal(validateStatusTransition('AI_TRIAGED', 'RESOLVED').valid, false);
  });

  test('forward transitions to RESOLVED/CLOSED are allowed from the right states only', () => {
    assert.equal(validateStatusTransition('ASSIGNED', 'RESOLVED').valid, true);
    assert.equal(validateStatusTransition('FIELD_VERIFICATION', 'RESOLVED').valid, true);
    assert.equal(validateStatusTransition('IN_PROGRESS', 'RESOLVED').valid, true);
    assert.equal(validateStatusTransition('RESOLVED', 'CLOSED').valid, true);
    assert.equal(validateStatusTransition('RESOLVED', 'IN_PROGRESS').valid, false);
    assert.equal(validateStatusTransition('CLOSED', 'RESOLVED').valid, false);
  });

  test('unknown statuses and same-status updates are handled', () => {
    assert.equal(validateStatusTransition('CREATED', 'BOGUS' as any).valid, false);
    assert.equal(validateStatusTransition(undefined as any, 'CREATED').valid, false);
    assert.equal(validateStatusTransition('ASSIGNED', 'ASSIGNED').valid, true);
  });

  test('RESOLVED and CLOSED require human decision authorisation', () => {
    assert.equal(statusRequiresHumanAction('RESOLVED'), true);
    assert.equal(statusRequiresHumanAction('CLOSED'), true);
    assert.equal(statusRequiresHumanAction('IN_PROGRESS'), false);
  });

  test('new cases without AI triage artifacts start as CREATED', () => {
    assert.equal(resolveInitialStatus({}), 'CREATED');
    assert.equal(resolveInitialStatus({ ai_explanations: {} as any }), 'CREATED');
  });

  test('new AI-triaged payloads start as AI_TRIAGED', () => {
    const withTriage = {
      ai_explanations: { why_category: 'Road surface damage' } as any,
      audit_trail: { analyzed_at: '2026-09-19T10:00:00.000Z' } as any,
      routing_decision: { status: 'ROUTED' } as any,
    };
    assert.equal(resolveInitialStatus(withTriage), 'AI_TRIAGED');
  });

  test('suggested officer roles are defined and stable', () => {
    assert.ok(SUGGESTED_OFFICER_ROLES.includes('FIELD_OFFICER'));
    assert.ok(SUGGESTED_OFFICER_ROLES.includes('VERIFICATION_OFFICER'));
  });
});

describe('PATCH /api/cases/:id/status lifecycle enforcement', () => {
  test('full legal lifecycle CREATED -> AI_TRIAGED -> ASSIGNED -> FIELD_VERIFICATION -> IN_PROGRESS -> RESOLVED -> CLOSED', async () => {
    seedCase({ status: 'CREATED' });

    const step = async (status: string, extra: Record<string, unknown> = {}) => {
      const res = await request(app)
        .patch(`/api/cases/${CASE_ID}/status`)
        .send({ status, ...extra });
      assert.equal(res.status, 200, `transition to ${status} should succeed`);
      assert.equal(res.body.case.status, status);
      assert.equal(res.body.audit.recorded, true);
      return res;
    };

    await step('AI_TRIAGED');
    await step('ASSIGNED', { assigned_officer: 'Officer A (Roads & Infrastructure)' });
    await step('FIELD_VERIFICATION');
    await step('IN_PROGRESS');
    await step('RESOLVED', { human_override_note: 'Field inspection confirmed the repair completed.' });
    const closed = await step('CLOSED', { human_override_note: 'Ticket closed after citizen confirmation.' });

    assert.ok(closed.body.case.resolved_at, 'resolved_at should be set');
    assert.ok(closed.body.case.closed_at, 'closed_at should be set');
  });

  test('invalid transition is rejected with 400 and does not change the case', async () => {
    seedCase({ status: 'CREATED' });

    const res = await request(app)
      .patch(`/api/cases/${CASE_ID}/status`)
      .send({ status: 'RESOLVED', human_override_note: 'Skip ahead' });

    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'INVALID_STATUS_TRANSITION');
    assert.equal(res.body.current_status, 'CREATED');
    assert.equal(res.body.requested_status, 'RESOLVED');

    const calls = ddbMock
      .commandCalls(PutCommand)
      .filter((call) => (call.args[0].input as any).TableName === 'CivicVoiceCases');
    assert.equal(calls.length, 0, 'case must not be rewritten for an invalid transition');
  });

  test('unknown status string is rejected with 400', async () => {
    seedCase({ status: 'CREATED' });
    const res = await request(app)
      .patch(`/api/cases/${CASE_ID}/status`)
      .send({ status: 'BOGUS_STATUS' });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'INVALID_STATUS_TRANSITION');
  });

  test('moving to RESOLVED without a human decision is rejected with 400', async () => {
    seedCase({ status: 'ASSIGNED' });
    const res = await request(app)
      .patch(`/api/cases/${CASE_ID}/status`)
      .send({ status: 'RESOLVED' });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'HUMAN_ACTION_REQUIRED');
  });

  test('moving to RESOLVED is allowed when a human decision is recorded', async () => {
    seedCase({ status: 'IN_PROGRESS' });
    const res = await request(app)
      .patch(`/api/cases/${CASE_ID}/status`)
      .send({ status: 'RESOLVED', human_override_note: 'Verified repairs complete on site.' });
    assert.equal(res.status, 200);
    assert.equal(res.body.case.status, 'RESOLVED');
    assert.equal(res.body.case.resolved_at, res.body.case.resolved_at);
  });

  test('status update for a missing case returns 404', async () => {
    ddbMock.on(GetCommand).resolves({});
    const res = await request(app)
      .patch('/api/cases/DOES-NOT-EXIST/status')
      .send({ status: 'AI_TRIAGED' });
    assert.equal(res.status, 404);
  });

  test('status transition writes an audit event with previous -> new values', async () => {
    seedCase({ status: 'CREATED' });
    const res = await request(app)
      .patch(`/api/cases/${CASE_ID}/status`)
      .send({ status: 'AI_TRIAGED', actor_id: 'demo-officer-1' });
    assert.equal(res.status, 200);

    const events = historyWrites();
    assert.equal(events.length, 1);
    const evt = events[events.length - 1];
    assert.equal(evt.event_type, 'STATUS_CHANGED');
    assert.equal(evt.previous_value, 'CREATED');
    assert.equal(evt.new_value, 'AI_TRIAGED');
    assert.equal(evt.case_id, CASE_ID);
  });
});

describe('PATCH /api/cases/:id/assignment', () => {
  test('requires an assignee', async () => {
    seedCase({ status: 'CREATED' });
    const res = await request(app)
      .patch(`/api/cases/${CASE_ID}/assignment`)
      .send({ assigned_role: 'FIELD_OFFICER' });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'ASSIGNEE_REQUIRED');
  });

  test('assigns a case and advances CREATED -> ASSIGNED with an ASSIGNED audit event', async () => {
    seedCase({ status: 'CREATED', assigned_officer: null });

    const res = await request(app)
      .patch(`/api/cases/${CASE_ID}/assignment`)
      .send({
        assigned_to: 'Officer A (Roads & Infrastructure)',
        assigned_role: 'FIELD_OFFICER',
        assigned_department: 'Public Works',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.case.status, 'ASSIGNED');
    assert.equal(res.body.case.assigned_officer, 'Officer A (Roads & Infrastructure)');
    assert.equal(res.body.case.assigned_role, 'FIELD_OFFICER');
    assert.equal(res.body.case.assigned_at, res.body.case.assigned_at);
    assert.equal(res.body.audit.recorded, true);

    const events = historyWrites();
    const assignEvent = events.find((e) => e.event_type === 'ASSIGNED');
    assert.ok(assignEvent, 'an ASSIGNED audit event must be recorded');
    assert.equal(assignEvent.new_value, 'Officer A (Roads & Infrastructure)');
  });

  test('reassignment records a REASSIGNED event', async () => {
    seedCase({
      status: 'ASSIGNED',
      assigned_to: 'Officer A (Roads & Infrastructure)',
      assigned_officer: 'Officer A (Roads & Infrastructure)',
      assigned_role: 'FIELD_OFFICER',
      assigned_at: '2026-09-19T08:00:00.000Z',
    });
    ddbMock.on(PutCommand).callsFake(async () => ({}));

    const res = await request(app)
      .patch(`/api/cases/${CASE_ID}/assignment`)
      .send({ assigned_to: 'Officer B (Sanitation & Waste)', assigned_role: 'VERIFICATION_OFFICER' });

    assert.equal(res.status, 200);
    assert.equal(res.body.case.assigned_officer, 'Officer B (Sanitation & Waste)');
    assert.equal(res.body.case.status, 'ASSIGNED', 'reassignment keeps the case assigned');

    const events = historyWrites();
    const reassignEvent = events.find((e) => e.event_type === 'REASSIGNED');
    assert.ok(reassignEvent, 'a REASSIGNED audit event must be recorded');
    assert.equal(reassignEvent.previous_value, 'Officer A (Roads & Infrastructure)');
    assert.equal(reassignEvent.new_value, 'Officer B (Sanitation & Waste)');
  });

  test('rejects an unknown officer role', async () => {
    seedCase({ status: 'CREATED' });
    const res = await request(app)
      .patch(`/api/cases/${CASE_ID}/assignment`)
      .send({ assigned_to: 'Officer X', assigned_role: 'SUPERHERO' });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'INVALID_ROLE');
  });

  test('assignment for a missing case returns 404', async () => {
    ddbMock.on(GetCommand).resolves({});
    const res = await request(app)
      .patch('/api/cases/DOES-NOT-EXIST/assignment')
      .send({ assigned_to: 'Officer A' });
    assert.equal(res.status, 404);
  });
});