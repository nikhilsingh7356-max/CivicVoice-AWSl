import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_DEMO_CASES } from '../src/demoData.ts';

const VALID_STATUSES = ['CREATED', 'AI_TRIAGED', 'ASSIGNED', 'FIELD_VERIFICATION', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const VALID_PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

describe('demo data — deterministic local sample dataset', () => {
  test('ships a non-empty set of cases', () => {
    assert.ok(INITIAL_DEMO_CASES.length >= 4);
  });

  test('every case has a stable id and a well-formed title', () => {
    for (const c of INITIAL_DEMO_CASES) {
      assert.match(c.case_id, /^CV-\d{4}-\d{3}$/, c.case_id);
      assert.ok(c.title.length > 5);
    }
  });

  test('every case uses a valid status and priority', () => {
    for (const c of INITIAL_DEMO_CASES) {
      assert.ok(VALID_STATUSES.includes(c.status), `${c.case_id} status ${c.status}`);
      assert.ok(VALID_PRIORITIES.includes(c.priority), `${c.case_id} priority ${c.priority}`);
    }
  });

  test('every case has plot-able coordinates for the map', () => {
    for (const c of INITIAL_DEMO_CASES) {
      assert.ok(c.coordinates, `${c.case_id} missing coordinates`);
      assert.equal(typeof c.coordinates.lat, 'number');
      assert.equal(typeof c.coordinates.lng, 'number');
    }
  });

  test('sample coverage spans categories so dashboards are not empty', () => {
    const categories = new Set(INITIAL_DEMO_CASES.map((c) => c.category));
    assert.ok(categories.size >= 3);
  });

  test('AI-structured fields are present so detail views render fully', () => {
    for (const c of INITIAL_DEMO_CASES) {
      assert.ok(c.routing_decision, `${c.case_id} missing routing_decision`);
      assert.ok(c.ai_verification, `${c.case_id} missing ai_verification`);
      assert.ok(Array.isArray(c.recommended_action) && c.recommended_action.length > 0);
    }
  });
});