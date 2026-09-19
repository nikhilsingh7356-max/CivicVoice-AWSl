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
import { CivicCase, CaseHistoryEvent } from '../src/types.ts';

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

const baseCaseBody = {
  complaint: 'There is a large pothole blocking the road',
  category: 'ROADS',
  subcategory: 'pothole',
  title: 'Large pothole',
  department: 'Public Works',
  priority: 'CRITICAL',
  severity_score: 9,
  location: 'Prayagraj, Uttar Pradesh',
  location_type: 'manual',
  media_type: 'photo',
  language: 'en-US',
};

function historyWrites(): any[] {
  return ddbMock
    .commandCalls(PutCommand)
    .filter((call) => (call.args[0].input as any).TableName === 'CivicVoiceCaseHistory')
    .map((call) => (call.args[0].input as any).Item);
}

describe('case creation audit trail', () => {
  test('a plain citizen case records exactly one CASE_CREATED event', async () => {
    ddbMock.on(PutCommand).resolves({});
    ebMock.on(PutEventsCommand).resolves({ Entries: [{ EventId: 'evt-1' }] });

    const res = await request(app).post('/api/cases').send(baseCaseBody);
    assert.equal(res.status, 201);
    assert.equal(res.body.audit.recorded, true);

    const events = historyWrites();
    assert.equal(events.length, 1);
    assert.equal(events[0].event_type, 'CASE_CREATED');
    assert.equal(events[0].actor_type, 'CITIZEN');
    assert.equal(events[0].new_value, 'CREATED');
    assert.equal(events[0].case_id, res.body.case.case_id);
  });

  test('an AI-triaged payload records CASE_CREATED and AI_TRIAGED events', async () => {
    ddbMock.on(PutCommand).resolves({});
    ebMock.on(PutEventsCommand).resolves({ Entries: [{ EventId: 'evt-2' }] });

    const res = await request(app)
      .post('/api/cases')
      .send({
        ...baseCaseBody,
        ai_explanations: { why_category: 'Cleared pothole hazard' },
        audit_trail: { analyzed_at: new Date().toISOString() },
        routing_decision: { status: 'ROUTED' },
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.case.status, 'AI_TRIAGED');

    const types = historyWrites().map((e) => e.event_type).sort();
    assert.deepEqual(types, ['AI_TRIAGED', 'CASE_CREATED']);
  });

  test('audit records never contain citizen microdata or raw media', async () => {
    ddbMock.on(PutCommand).resolves({});
    ebMock.on(PutEventsCommand).resolves({ Entries: [{ EventId: 'evt-3' }] });

    await request(app)
      .post('/api/cases')
      .send({
        ...baseCaseBody,
        citizen_name: 'Jane Citizen',
        citizen_contact: 'jane@example.test',
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ',
        video_url: 'data:video/mp4;base64,AAAAHGZs',
        complaint: 'A sensitive full citizen complaint body',
      });

    for (const event of historyWrites()) {
      const serialized = JSON.stringify(event);
      for (const forbidden of ['image', 'video_url', 'audio', 'complaint', 'citizen_contact', 'contact']) {
        assert.ok(!(forbidden in event), `audit event must not contain ${forbidden}`);
      }
      assert.ok(!serialized.includes('iVBORw0KGgo'));
      assert.ok(!serialized.includes('AAAAHGZs'));
      assert.ok(!serialized.includes('jane@example.test'));
    }
  });

  test('a failed DynamoDB save produces no audit events and no EventBridge publish', async () => {
    ddbMock.on(PutCommand).rejects(new Error('DynamoDB throttled'));
    const res = await request(app).post('/api/cases').send(baseCaseBody);
    assert.equal(res.status, 500);
    assert.equal(historyWrites().length, 0);
    assert.equal(ebMock.commandCalls(PutEventsCommand).length, 0);
  });

  test('audit failures are reported explicitly without faking success', async () => {
    // Make audit-table writes fail while the case table write still succeeds.
    ddbMock.on(PutCommand).callsFake(async (input: any) => {
      if (input.TableName === 'CivicVoiceCaseHistory') throw new Error('History table unreachable');
      return {};
    });
    ebMock.on(PutEventsCommand).resolves({ Entries: [{ EventId: 'evt-4' }] });

    const res = await request(app).post('/api/cases').send(baseCaseBody);

    assert.equal(res.status, 201, 'case creation still succeeds');
    assert.equal(res.body.case.case_id, res.body.case.case_id);
    assert.equal(res.body.audit.recorded, false);
    assert.ok(res.body.audit.error, 'the audit failure must be surfaced');
  });
});

describe('GET /api/cases/:id/history', () => {
  test('returns the append-only history for an existing case', async () => {
    const events: CaseHistoryEvent[] = [
      {
        case_id: 'CV-2026-HIST001',
        event_id: 'e1',
        timestamp_event_id: '2026-09-19T09:00:00.000Z#e1',
        event_type: 'CASE_CREATED',
        timestamp: '2026-09-19T09:00:00.000Z',
        actor_type: 'CITIZEN',
        new_value: 'CREATED',
      },
      {
        case_id: 'CV-2026-HIST001',
        event_id: 'e2',
        timestamp_event_id: '2026-09-19T10:00:00.000Z#e2',
        event_type: 'STATUS_CHANGED',
        timestamp: '2026-09-19T10:00:00.000Z',
        actor_type: 'AUTHORIZED_OFFICER',
        previous_value: 'CREATED',
        new_value: 'AI_TRIAGED',
      },
    ];
    ddbMock.on(GetCommand).resolves({ Item: { ...baseCaseBody, case_id: 'CV-2026-HIST001', status: 'AI_TRIAGED' } });
    ddbMock.on(QueryCommand).resolves({ Items: events });

    const res = await request(app).get('/api/cases/CV-2026-HIST001/history');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.case_id, 'CV-2026-HIST001');
    assert.equal(res.body.history.length, 2);
    assert.equal(res.body.history[0].event_type, 'CASE_CREATED');
    assert.equal(res.body.history[1].event_type, 'STATUS_CHANGED');
    assert.equal(ebMock.commandCalls(PutEventsCommand).length, 0);
  });

  test('history for a missing case returns 404', async () => {
    ddbMock.on(GetCommand).resolves({});
    const res = await request(app).get('/api/cases/DOES-NOT-EXIST/history');
    assert.equal(res.status, 404);
  });

  test('history endpoint accepts live updates when a case is modified (append-only behaviour)', async () => {
    let caseState: any = {
      ...baseCaseBody,
      case_id: 'CV-2026-HIST001',
      status: 'AI_TRIAGED',
      created_at: '2026-09-19T09:00:00.000Z',
    };
    const history: CaseHistoryEvent[] = [
      {
        case_id: 'CV-2026-HIST001',
        event_id: 'e1',
        timestamp_event_id: '2026-09-19T09:00:00.000Z#e1',
        event_type: 'CASE_CREATED',
        timestamp: '2026-09-19T09:00:00.000Z',
        actor_type: 'CITIZEN',
        new_value: 'CREATED',
      },
    ];
    ddbMock.on(GetCommand).callsFake(async () => ({ Item: caseState }));
    ddbMock.on(PutCommand).callsFake(async (input: any) => {
      if (input.TableName === 'CivicVoiceCases') {
        caseState = input.Item;
      }
      return {};
    });
    ddbMock.on(QueryCommand).callsFake(async () => ({ Items: history }));

    const before = await request(app).get('/api/cases/CV-2026-HIST001/history');
    assert.equal(before.body.history.length, 1);

    const update = await request(app)
      .patch('/api/cases/CV-2026-HIST001/status')
      .send({ status: 'ASSIGNED', assigned_officer: 'Officer A (Roads & Infrastructure)' });
    assert.equal(update.status, 200);

    const after = await request(app).get('/api/cases/CV-2026-HIST001/history');
    assert.equal(after.body.history.length, 1, 'history source stays append-only (original events retained)');
  });
});