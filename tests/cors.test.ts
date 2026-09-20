import { before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import type { Express } from 'express';

process.env.AWS_LAMBDA_FUNCTION_NAME = 'test';
process.env.AWS_ACCESS_KEY_ID = 'test';
process.env.AWS_REGION = 'ap-south-1';
delete process.env.MEDIA_BUCKET;
delete process.env.FRONTEND_ALLOWED_ORIGINS;
process.env.DISABLE_CLOUDWATCH_METRICS = 'true';

const PROD_ORIGIN = 'https://main.d3b8da5vp73lda.amplifyapp.com';

let app: Express;

before(async () => {
  ({ app } = await import('../server.ts'));
});

beforeEach(() => {
  delete process.env.FRONTEND_ALLOWED_ORIGINS;
});

describe('CORS — OPTIONS preflight (single source of truth in Express/Lambda)', () => {
  test('production Amplify origin gets a 204 preflight with allow headers', async () => {
    const res = await request(app)
      .options('/api/analyze')
      .set('Origin', PROD_ORIGIN)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,authorization');

    assert.equal(res.status, 204);
    assert.equal(res.headers['access-control-allow-origin'], PROD_ORIGIN);
    const methods = String(res.headers['access-control-allow-methods']);
    for (const m of ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']) assert.ok(methods.includes(m), `methods include ${m}`);
    const headers = String(res.headers['access-control-allow-headers']).toLowerCase();
    for (const h of ['content-type', 'authorization', 'accept', 'origin']) assert.ok(headers.includes(h), `headers include ${h}`);
  });

  test('localhost dev origins (any port) pass preflight', async () => {
    for (const origin of ['http://localhost:3000', 'http://localhost:3210', 'http://localhost:5173', 'http://127.0.0.1:3210']) {
      const res = await request(app).options('/api/cases').set('Origin', origin);
      assert.equal(res.status, 204);
      assert.equal(res.headers['access-control-allow-origin'], origin);
    }
  });

  test('disallowed origin gets NO CORS headers on preflight', async () => {
    const res = await request(app).options('/api/cases').set('Origin', 'https://evil.example.com');
    assert.equal(res.status, 204);
    assert.equal(res.headers['access-control-allow-origin'], undefined);
  });
});

describe('CORS — actual requests', () => {
  test('GET response from the API includes Access-Control-Allow-Origin for prod origin', async () => {
    const res = await request(app).get('/api/authorities').set('Origin', PROD_ORIGIN);
    assert.equal(res.status, 200);
    assert.equal(res.headers['access-control-allow-origin'], PROD_ORIGIN);
  });

  test('GET response without an Origin header carries no CORS gateway header', async () => {
    const res = await request(app).get('/api/authorities');
    assert.equal(res.status, 200);
    assert.equal(res.headers['access-control-allow-origin'], undefined);
  });

  test('API error responses also carry CORS headers for an allowed origin', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .set('Origin', PROD_ORIGIN)
      .send({});
    assert.equal(res.status, 400);
    assert.equal(res.headers['access-control-allow-origin'], PROD_ORIGIN);
  });

  test('FRONTEND_ALLOWED_ORIGINS env var adds extra origins', async () => {
    process.env.FRONTEND_ALLOWED_ORIGINS = `https://spa.example,${PROD_ORIGIN}`;
    const { app: freshApp } = await import('../server.ts');
    const res = await request(freshApp).get('/api/authorities').set('Origin', 'https://spa.example');
    assert.equal(res.status, 200);
    assert.equal(res.headers['access-control-allow-origin'], 'https://spa.example');
  });
});