import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiUrl } from '../src/lib/api.ts';

const PROD_GATEWAY = 'https://w2o3ktyph9.execute-api.ap-south-1.amazonaws.com/Prod';

describe('apiUrl — join behavior (pure resolveApiUrl)', () => {
  test('base URL WITHOUT trailing slash joins a leading-slash path', () => {
    assert.equal(
      resolveApiUrl(PROD_GATEWAY, true, '/api/cases'),
      `${PROD_GATEWAY}/api/cases`
    );
  });

  test('base URL WITH trailing slash is trimmed before joining', () => {
    assert.equal(
      resolveApiUrl(`${PROD_GATEWAY}/`, true, '/api/cases'),
      `${PROD_GATEWAY}/api/cases`
    );
    assert.equal(
      resolveApiUrl(`${PROD_GATEWAY}///`, true, '/api/cases'),
      `${PROD_GATEWAY}/api/cases`
    );
  });

  test('path WITHOUT a leading slash is normalized (no insecure join)', () => {
    assert.equal(
      resolveApiUrl(PROD_GATEWAY, true, 'api/analyze'),
      `${PROD_GATEWAY}/api/analyze`
    );
  });

  test('never produces a double slash at the seam', () => {
    const url = resolveApiUrl(`${PROD_GATEWAY}/`, true, '/api/cases');
    assert.equal(url.includes('//execute-api'), false);
    assert.equal(url.includes(`${PROD_GATEWAY}//`), false);
  });

  test('query strings are preserved untouched', () => {
    assert.equal(
      resolveApiUrl(PROD_GATEWAY, true, '/api/cases?status=OPEN&page=2'),
      `${PROD_GATEWAY}/api/cases?status=OPEN&page=2`
    );
  });

  test('nested paths with interpolated ids join correctly', () => {
    assert.equal(
      resolveApiUrl(PROD_GATEWAY, false, '/api/cases/CV-2026-001/history'),
      `${PROD_GATEWAY}/api/cases/CV-2026-001/history`
    );
  });
});

describe('apiUrl — local development and production fallback', () => {
  test('missing base + non-production returns the relative path unchanged', () => {
    assert.equal(resolveApiUrl('', false, '/api/cases'), '/api/cases');
    assert.equal(resolveApiUrl('', false, '/api/policy/recommendations'), '/api/policy/recommendations');
  });

  test('missing base + non-production normalizes a slash-less relative path', () => {
    assert.equal(resolveApiUrl('', false, 'api/cases'), '/api/cases');
  });

  test('missing base + PRODUCTION throws a clear, actionable error', () => {
    assert.throws(
      () => resolveApiUrl('', true, '/api/cases'),
      (err: unknown) => {
        const msg = err instanceof Error ? err.message : '';
        assert.match(msg, /VITE_API_BASE_URL/);
        assert.match(msg, /execute-api/);
        assert.match(msg, /Amplify environment variables/);
        return true;
      }
    );
  });

  test('explicit base wins in production (no silent relative fallback)', () => {
    assert.equal(
      resolveApiUrl(PROD_GATEWAY, true, '/api/cases'),
      `${PROD_GATEWAY}/api/cases`
    );
  });
});