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
import { computeAnalyticsSummary, computeHotspots, isUsableCoordinates } from '../src/server/analytics.ts';

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

function makeCase(overrides: Partial<CivicCase> = {}): CivicCase {
  return {
    case_id: `CV-2026-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
    created_at: '2026-09-19T10:00:00.000Z',
    complaint: 'test',
    title: 'Test issue',
    category: 'ROADS',
    department: 'Public Works',
    priority: 'MEDIUM',
    severity_score: 5,
    location: 'Prayagraj',
    status: 'CREATED',
    ai_generated: true,
    ...overrides,
  } as CivicCase;
}

describe('computeAnalyticsSummary (pure)', () => {
  test('aggregates totals, open/resolved, and priority buckets', () => {
    const cases = [
      makeCase({ priority: 'CRITICAL', status: 'IN_PROGRESS' }),
      makeCase({ priority: 'HIGH', status: 'RESOLVED' }),
      makeCase({ priority: 'LOW', status: 'CLOSED' }),
      makeCase({ priority: 'MEDIUM', status: 'CREATED' }),
    ];
    const summary = computeAnalyticsSummary(cases);

    assert.equal(summary.total_cases, 4);
    assert.equal(summary.open_cases, 2);
    assert.equal(summary.resolved_cases, 2);
    assert.equal(summary.critical_priority, 1);
    assert.equal(summary.high_priority, 1);
    assert.equal(summary.by_status.RESOLVED, 1);
    assert.equal(summary.by_category.ROADS, 4);
  });

  test('returns an empty summary (not a crash) for no cases', () => {
    const summary = computeAnalyticsSummary([]);
    assert.equal(summary.total_cases, 0);
    assert.equal(summary.open_cases, 0);
    assert.deepEqual(summary.recent_cases, []);
  });

  test('recent cases are sorted newest-first with stable metadata', () => {
    const cases = [
      makeCase({ created_at: '2026-09-17T10:00:00.000Z' }),
      makeCase({ created_at: '2026-09-19T10:00:00.000Z' }),
      makeCase({ created_at: '2026-09-18T10:00:00.000Z' }),
    ];
    const summary = computeAnalyticsSummary(cases);
    assert.equal(summary.recent_cases.length, 3);
    assert.ok(
      summary.recent_cases[0].created_at >= summary.recent_cases[1].created_at,
      'newest reports first'
    );
    assert.equal(summary.recent_cases[0].category, 'ROADS');
    assert.equal(summary.recent_cases[0].status, 'CREATED');
  });
});

describe('computeHotspots (pure, geocoded concentration)', () => {
  test('clusters nearby reports into one hotspot with a real average centroid', () => {
    const cases = [
      makeCase({ coordinates: { lat: 25.4358, lng: 81.8463 } }),
      makeCase({ coordinates: { lat: 25.4359, lng: 81.8464 } }),
      makeCase({ coordinates: { lat: 25.4361, lng: 81.8466 } }),
    ];
    const result = computeHotspots(cases, { radiusKm: 2 });
    assert.equal(result.hotspots.length, 1, 'nearby reports merge into a single concentration');
    const hotspot = result.hotspots[0];
    assert.equal(hotspot.case_count, 3);
    assert.equal(hotspot.dominant_category, 'ROADS');
    assert.ok(
      Math.abs(hotspot.latitude - (25.4358 + 25.4359 + 25.4361) / 3) < 0.001,
      'centroid is the average of ACTUAL reported coordinates, never invented'
    );
    assert.ok(
      Math.abs(hotspot.longitude - (81.8463 + 81.8464 + 81.8466) / 3) < 0.001
    );
  });

  test('keeps distant reports as separate hotspots sorted by case count', () => {
    const cases = [
      makeCase({ coordinates: { lat: 25.4358, lng: 81.8463 } }),
      makeCase({ coordinates: { lat: 25.4359, lng: 81.8464 } }),
      makeCase({ coordinates: { lat: 28.6139, lng: 77.2090 } }),
      makeCase({ coordinates: { lat: 19.0760, lng: 72.8777 } }),
    ];
    const result = computeHotspots(cases, { radiusKm: 2 });
    assert.equal(result.hotspots.length, 3);
    assert.equal(result.hotspots[0].case_count, 2, 'the densest cluster comes first');
  });

  test('flags cases without usable coordinates as excluded, not fabricated', () => {
    const cases = [
      makeCase({ coordinates: { lat: 25.4358, lng: 81.8463 } }),
      makeCase({ coordinates: undefined }),
      makeCase({ coordinates: { lat: 91, lng: 400 } as any }),
    ];
    const result = computeHotspots(cases, { radiusKm: 2 });
    assert.equal(result.geocoded_cases, 1);
    assert.equal(result.excluded_cases, 2);
    assert.equal(result.hotspots.length, 1);
    assert.equal(isUsableCoordinates({ coordinates: { lat: 25.4, lng: 81.8 } }), true);
    assert.equal(isUsableCoordinates({ coordinates: { lat: 91, lng: 81.8 } }), false);
    assert.equal(isUsableCoordinates({}), false);
  });

  test('hotspots carry an honest, non-predictive disclaimer note', () => {
    const result = computeHotspots([makeCase({ coordinates: { lat: 25.4358, lng: 81.8463 } })]);
    assert.match(result.note, /reported/);
    assert.match(result.note, /not a prediction|not.*predict/i);
  });
});

describe('GET /api/analytics endpoints (API)', () => {
  test('/api/analytics/summary computes from the live cases table', async () => {
    ddbMock.on(ScanCommand).resolves({
      Items: [
        makeCase({ priority: 'CRITICAL', status: 'IN_PROGRESS', coordinates: { lat: 25.4358, lng: 81.8463 } }),
        makeCase({ priority: 'HIGH', status: 'RESOLVED', coordinates: { lat: 25.4359, lng: 81.8464 } }),
      ],
    });

    const res = await request(app).get('/api/analytics/summary');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.summary.total_cases, 2);
    assert.equal(res.body.summary.open_cases, 1);
    assert.equal(res.body.summary.resolved_cases, 1);
    assert.equal(res.body.summary.critical_priority, 1);
  });

  test('/api/analytics/hotspots returns real coordinate concentrations with dominant category', async () => {
    ddbMock.on(ScanCommand).resolves({
      Items: [
        makeCase({ category: 'ROADS', coordinates: { lat: 25.4358, lng: 81.8463 } }),
        makeCase({ category: 'ROADS', coordinates: { lat: 25.4359, lng: 81.8464 } }),
        makeCase({ category: 'WASTE', coordinates: { lat: 28.6139, lng: 77.2090 } }),
      ],
    });

    const res = await request(app).get('/api/analytics/hotspots?radius_km=1');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.total_cases, 3);
    assert.ok(res.body.hotspots.length >= 2);

    const densest = res.body.hotspots[0];
    assert.equal(densest.case_count, 2);
    assert.equal(densest.dominant_category, 'ROADS');
    assert.ok(densest.latitude, 'hotspot keeps real coordinates');
    assert.match(res.body.note, /reported case concentration/i);
    assert.equal(ebMock.commandCalls(PutEventsCommand).length, 0, 'analytics reads never publish events');
  });

  test('analytics endpoints surface a 500 when the cases table is unreachable', async () => {
    ddbMock.on(ScanCommand).rejects(new Error('Scan throttled'));
    const res = await request(app).get('/api/analytics/summary');
    assert.equal(res.status, 500);
    assert.equal(res.body.success, false);
  });
});