import { before, beforeEach, test, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import type { Express } from 'express';

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

interface PutEventsInput {
  EventBusName?: string;
  Source?: string;
  DetailType?: string;
  Detail?: string;
  Time?: Date;
}

function getPublishedEventDetail(): any {
  const calls = ebMock.commandCalls(PutEventsCommand);
  assert.ok(calls.length >= 1, 'Expected PutEventsCommand to have been called');
  const entry = (calls[0].args[0].input as any).Entries[0] as PutEventsInput;
  assert.equal(entry.Source, 'civicvoice');
  assert.equal(entry.DetailType, 'CivicCaseCreated');
  assert.equal(entry.EventBusName, 'CivicVoiceEventBus');
  return JSON.parse(entry.Detail!);
}

// Post-Audit Trails: every case creation also writes one audit record to the
// case history table, so DynamoDB Put hard-assertions must be table-aware.
function writesToCasesTable(): any[] {
  return ddbMock
    .commandCalls(PutCommand)
    .filter((call) => (call.args[0].input as any).TableName === 'CivicVoiceCases');
}

function writesToHistoryTable(): any[] {
  return ddbMock
    .commandCalls(PutCommand)
    .filter((call) => (call.args[0].input as any).TableName === 'CivicVoiceCaseHistory');
}

describe('POST /api/cases + EventBridge', () => {
  test('saves the case to DynamoDB and publishes a CivicCaseCreated event', async () => {
    ddbMock.on(PutCommand).resolves({});
    ebMock.on(PutEventsCommand).resolves({ Entries: [{ EventId: 'evt-published-001' }] });

    const res = await request(app).post('/api/cases').send(baseCaseBody);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);

    const writes = writesToCasesTable();
    assert.equal(writes.length, 1, 'exactly one case write to the cases table');
    const persisted = (writes[0].args[0].input as any).Item;
    assert.ok(persisted.case_id);
    assert.equal(persisted.category, 'ROADS');
    assert.equal(persisted.priority, 'CRITICAL');

    const events = ebMock.commandCalls(PutEventsCommand);
    assert.equal(events.length, 1);
    assert.equal(res.body.event.published, true);
    assert.equal(res.body.event.event_id, 'evt-published-001');
    assert.equal(res.body.case.case_id, persisted.case_id);
  });

  test('event detail contains required routing metadata matching the saved case', async () => {
    ddbMock.on(PutCommand).resolves({});
    ebMock.on(PutEventsCommand).resolves({ Entries: [{ EventId: 'evt-published-002' }] });

    const res = await request(app).post('/api/cases').send(baseCaseBody);

    const detail = getPublishedEventDetail();
    assert.equal(detail.case_id, res.body.case.case_id);
    assert.equal(detail.category, 'ROADS');
    assert.equal(detail.department, 'Public Works');
    assert.equal(detail.priority, 'CRITICAL');
    assert.equal(detail.severity_score, 9);
    assert.equal(detail.location, 'Prayagraj, Uttar Pradesh');
    assert.ok(detail.created_at, 'created_at must be present');
  });

  test('raw image/audio is never included in the EventBridge detail', async () => {
    ddbMock.on(PutCommand).resolves({});
    ebMock.on(PutEventsCommand).resolves({ Entries: [{ EventId: 'evt-published-003' }] });

    const res = await request(app)
      .post('/api/cases')
      .send({
        ...baseCaseBody,
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ',
        video_url: 'data:video/mp4;base64,AAAAHGZs',
      });

    assert.equal(res.status, 201);
    const detail = getPublishedEventDetail();
    for (const forbidden of ['image', 'video_url', 'audio', 'complaint', 'evidence_object_key']) {
      assert.ok(!(forbidden in detail), `detail must not contain ${forbidden}`);
    }
    const serialized = JSON.stringify(detail);
    assert.ok(!serialized.includes('iVBORw0KGgo'));
    assert.ok(!serialized.includes('AAAAHGZs'));

    const persisted = (writesToCasesTable()[0].args[0].input as any).Item;
    assert.ok(!('image' in persisted), 'raw image must not be persisted to DynamoDB');
  });

  test('DynamoDB save failure does not publish an EventBridge event', async () => {
    ddbMock.on(PutCommand).rejects(new Error('DynamoDB throttled'));

    const res = await request(app).post('/api/cases').send(baseCaseBody);

    assert.equal(res.status, 500);
    assert.equal(ebMock.commandCalls(PutEventsCommand).length, 0);
  });

  test('EventBridge failure keeps the DynamoDB case and reports the notification failure honestly', async () => {
    ddbMock.on(PutCommand).resolves({});
    ebMock.on(PutEventsCommand).rejects(new Error('EventBridge unavailable'));

    const res = await request(app).post('/api/cases').send(baseCaseBody);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.case.case_id, 'persisted case must be returned intact');
    assert.equal(res.body.event.published, false);
    assert.match(res.body.event.error, /EventBridge/);

    assert.equal(writesToCasesTable().length, 1, 'case must remain in DynamoDB');
    assert.equal(ddbMock.commandCalls(DeleteCommand).length, 0, 'case must not be deleted');
  });
});

describe('GET endpoints must never publish CivicCaseCreated', () => {
  test('GET /api/cases does not publish events', async () => {
    ddbMock.on(ScanCommand).resolves({ Items: [] });

    const res = await request(app).get('/api/cases');

    assert.equal(res.status, 200);
    assert.equal(ebMock.commandCalls(PutEventsCommand).length, 0);
  });

  test('GET /api/cases/:id does not publish events', async () => {
    ddbMock
      .on(GetCommand)
      .resolves({ Item: { ...baseCaseBody, case_id: 'CV-2026-ABC12345', created_at: new Date().toISOString() } });

    const res = await request(app).get('/api/cases/CV-2026-ABC12345');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(ebMock.commandCalls(PutEventsCommand).length, 0);
  });

  test('POST /api/cases/:id/ask-ai does not publish CivicCaseCreated', async () => {
    ddbMock
      .on(GetCommand)
      .resolves({ Item: { ...baseCaseBody, case_id: 'CV-2026-ABC12345', created_at: new Date().toISOString(), status: 'AI_TRIAGED' } });
    bedrockMock.on(ConverseCommand).resolves({ output: { message: { content: [{ text: 'Field inspection recommended.' }] } } } as any);

    const res = await request(app)
      .post('/api/cases/CV-2026-ABC12345/ask-ai')
      .send({ question: 'What should the officer verify?' });

    assert.equal(res.status, 200);
    assert.equal(ebMock.commandCalls(PutEventsCommand).length, 0);
  });

  test('GET /api/analytics/summary and /api/analytics/hotspots do not publish events', async () => {
    ddbMock.on(ScanCommand).resolves({ Items: [] });

    const summary = await request(app).get('/api/analytics/summary');
    assert.equal(summary.status, 200);
    assert.equal(summary.body.success, true);
    assert.equal(summary.body.summary.total_cases, 0);

    const hotspots = await request(app).get('/api/analytics/hotspots');
    assert.equal(hotspots.status, 200);
    assert.equal(hotspots.body.success, true);
    assert.equal(hotspots.body.total_cases, 0);
    assert.equal(hotspots.body.hotspots.length, 0);

    assert.equal(ebMock.commandCalls(PutEventsCommand).length, 0);
  });
});