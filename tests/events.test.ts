import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CivicCase } from '../src/types.ts';
import {
  buildCivicCaseCreatedEventDetail,
  matchesCriticalAlertRule,
  CIVICVOICE_EVENT_BUS_NAME,
  CRITICAL_ALERT_PRIORITIES,
} from '../src/server/events.ts';

function makeCase(overrides: Partial<CivicCase> = {}): CivicCase {
  return {
    case_id: 'CV-2026-TEST1234',
    created_at: '2026-09-19T10:00:00.000Z',
    category: 'ROADS',
    department: 'Public Works',
    priority: 'CRITICAL',
    severity_score: 9,
    location: 'Prayagraj, Uttar Pradesh',
    coordinates: { lat: 25.4358, lng: 81.8463 },
    title: 'Pothole',
    complaint: 'Deep pothole',
    status: 'AI_TRIAGED',
    ai_generated: true,
    ...overrides,
  } as CivicCase;
}

describe('buildCivicCaseCreatedEventDetail', () => {
  test('includes all required routing metadata', () => {
    const detail = buildCivicCaseCreatedEventDetail(makeCase());
    assert.equal(detail.case_id, 'CV-2026-TEST1234');
    assert.equal(detail.category, 'ROADS');
    assert.equal(detail.department, 'Public Works');
    assert.equal(detail.priority, 'CRITICAL');
    assert.equal(detail.severity_score, 9);
    assert.equal(detail.location, 'Prayagraj, Uttar Pradesh');
    assert.equal(detail.created_at, '2026-09-19T10:00:00.000Z');
  });

  test('includes coordinates when available', () => {
    const detail = buildCivicCaseCreatedEventDetail(makeCase());
    assert.deepEqual(detail.coordinates, { latitude: 25.4358, longitude: 81.8463 });
  });

  test('omits coordinates when not available', () => {
    const detail = buildCivicCaseCreatedEventDetail(makeCase({ coordinates: undefined }));
    assert.equal(detail.coordinates, undefined);
  });

  test('event detail never carries raw image or audio data', () => {
    const detail = buildCivicCaseCreatedEventDetail(
      makeCase({
        image: 'data:image/png;base64,iVBORw0KGgo=',
        video_url: 'data:video/webm;base64,GkXfo59N',
        complaint: 'A long raw citizen complaint body',
      }),
    );
    const keys = Object.keys(detail);
    for (const forbidden of ['image', 'video_url', 'audio', 'complaint', 'evidence', 'raw']) {
      assert.ok(!keys.includes(forbidden), `event detail must not contain ${forbidden}`);
    }
    assert.ok(!JSON.stringify(detail).includes('iVBORw0KGgo='));
    assert.ok(!JSON.stringify(detail).includes('GkXfo59N'));
    assert.ok(!JSON.stringify(detail).includes('A long raw citizen complaint body'));
  });
});

describe('matchesCriticalAlertRule', () => {
  test('CRITICAL case matches the notification rule', () => {
    assert.equal(matchesCriticalAlertRule({ priority: 'CRITICAL' }), true);
  });

  test('HIGH case matches the notification rule (documented tier)', () => {
    assert.equal(matchesCriticalAlertRule({ priority: 'HIGH' }), true);
  });

  test('LOW case does not match the notification rule', () => {
    assert.equal(matchesCriticalAlertRule({ priority: 'LOW' }), false);
  });

  test('MEDIUM case does not match the notification rule', () => {
    assert.equal(matchesCriticalAlertRule({ priority: 'MEDIUM' }), false);
  });

  test('missing priority does not match the notification rule', () => {
    assert.equal(matchesCriticalAlertRule({}), false);
  });

  test('alert tiers are exactly CRITICAL and HIGH', () => {
    assert.deepEqual([...CRITICAL_ALERT_PRIORITIES], ['CRITICAL', 'HIGH']);
  });
});

describe('CIVICVOICE_EVENT_BUS_NAME', () => {
  test('defaults to the CivicVoiceEventBus bus name', () => {
    assert.equal(CIVICVOICE_EVENT_BUS_NAME, 'CivicVoiceEventBus');
  });
});