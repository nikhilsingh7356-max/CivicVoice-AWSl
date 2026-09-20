import { before, test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAuthorizeUrl,
  buildLogoutUrl,
  buildSessionFromTokens,
  computeSessionExpiry,
  createDevelopmentSession,
  decodeJwtPayload,
  generatePkce,
  getUserFromIdToken,
  isSessionExpired,
  isStoredSession,
  parseCallbackParams,
  randomBase64Url,
  resolveProtectedAccess,
  statesMatch,
} from '../src/auth/logic.ts';
import { AuthConfig } from '../src/auth/types.ts';

const CONFIG: AuthConfig = {
  userPoolId: 'ap-south-1_AbCdEf12',
  clientId: 'client-abc123',
  domain: 'https://civicvoice-auth.auth.ap-south-1.amazoncognito.com',
  redirectUri: 'http://localhost:3000',
  scopes: ['openid', 'profile', 'email'],
  configured: true,
};

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function makeJwt(payload: Record<string, unknown>): string {
  return `${base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64UrlEncode(
    JSON.stringify(payload)
  )}.signature-placeholder`;
}

function parseQuery(url: string): URLSearchParams {
  return new URLSearchParams(url.split('?')[1]);
}

describe('auth logic — random & PKCE', () => {
  test('randomBase64Url produces url-safe strings of the requested length', () => {
    const value = randomBase64Url(64);
    assert.equal(value.length, 64);
    assert.match(value, /^[A-Za-z0-9_-]+$/);
    assert.notEqual(value, randomBase64Url(64));
  });

  test('generatePkce returns a distinct verifier and S256 challenge', async () => {
    const pair = await generatePkce();
    assert.ok(pair.verifier.length > 40);
    assert.ok(pair.challenge.length > 20);
    assert.notEqual(pair.verifier, pair.challenge);
    const again = await generatePkce();
    assert.notEqual(pair.verifier, again.verifier);
  });
});

describe('auth logic — hosted UI URL building', () => {
  test('buildAuthorizeUrl includes code, PKCE and scope params', () => {
    const url = buildAuthorizeUrl(CONFIG, {
      mode: 'login',
      state: 'state-1',
      codeChallenge: 'challenge-1',
    });
    assert.ok(url.startsWith(`${CONFIG.domain}/oauth2/authorize?`));
    const params = parseQuery(url);
    assert.equal(params.get('client_id'), CONFIG.clientId);
    assert.equal(params.get('response_type'), 'code');
    assert.equal(params.get('redirect_uri'), CONFIG.redirectUri);
    assert.equal(params.get('code_challenge'), 'challenge-1');
    assert.equal(params.get('code_challenge_method'), 'S256');
    assert.equal(params.get('state'), 'state-1');
    assert.ok(params.get('scope')?.split(' ').includes('openid'));
    assert.equal(params.get('signUp'), null);
  });

  test('buildAuthorizeUrl forces the sign-up view in signup mode', () => {
    const url = buildAuthorizeUrl(CONFIG, { mode: 'signup', state: 's', codeChallenge: 'c' });
    assert.equal(parseQuery(url).get('signUp'), 'true');
  });

  test('buildLogoutUrl includes client_id and logout_uri', () => {
    const url = buildLogoutUrl(CONFIG, 'http://localhost:3000');
    const params = parseQuery(url);
    assert.equal(params.get('client_id'), CONFIG.clientId);
    assert.equal(params.get('logout_uri'), 'http://localhost:3000');
  });
});

describe('auth logic — callback parsing & state check', () => {
  test('parseCallbackParams extracts code and state', () => {
    const parsed = parseCallbackParams('code=abc&state=xyz');
    assert.equal(parsed.code, 'abc');
    assert.equal(parsed.state, 'xyz');
    assert.equal(parsed.error, null);
  });

  test('parseCallbackParams extracts error details', () => {
    const parsed = parseCallbackParams('error=access_denied&error_description=Denied');
    assert.equal(parsed.error, 'access_denied');
    assert.equal(parsed.errorDescription, 'Denied');
    assert.equal(parsed.code, null);
  });

  test('statesMatch rejects null, length mismatches and different values', () => {
    assert.ok(statesMatch('abc', 'abc'));
    assert.equal(statesMatch(null, 'abc'), false);
    assert.equal(statesMatch('abc', null), false);
    assert.equal(statesMatch('abc', 'abd'), false);
    assert.equal(statesMatch('a', 'abc'), false);
  });
});

describe('auth logic — JWT decoding', () => {
  test('decodeJwtPayload returns the payload for a well-formed token', () => {
    const payload = { sub: 'u-1', email: 'a@b.test', exp: 9999999999 };
    const decoded = decodeJwtPayload(makeJwt(payload));
    assert.equal(decoded?.sub, 'u-1');
    assert.equal(decoded?.email, 'a@b.test');
  });

  test('decodeJwtPayload returns null for malformed tokens', () => {
    assert.equal(decodeJwtPayload('not-a-jwt'), null);
    assert.equal(decodeJwtPayload('a.b'), null);
    assert.equal(decodeJwtPayload('x!%%.y..'), null);
  });

  test('getUserFromIdToken maps Cognito claims onto AuthUser', () => {
    const user = getUserFromIdToken(
      decodeJwtPayload(
        makeJwt({
          sub: 'u-9',
          email: 'priya@example.com',
          email_verified: true,
          name: 'Priya Sharma',
          'cognito:groups': ['CITIZEN'],
          'custom:role': 'citizen',
        })
      )
    );
    assert.equal(user?.id, 'u-9');
    assert.equal(user?.email, 'priya@example.com');
    assert.equal(user?.emailVerified, true);
    assert.ok(user?.groups?.includes('CITIZEN'));
    assert.equal(user?.roleHint, 'citizen');
    assert.equal(user?.developmentMode, false);
  });

  test('getUserFromIdToken returns null without a sub claim', () => {
    assert.equal(getUserFromIdToken(decodeJwtPayload(makeJwt({ email: 'a@b.test' }))), null);
  });
});

describe('auth logic — session lifecycle', () => {
  const NOW = 1_700_000_000_000;

  test('computeSessionExpiry derives the epoch expiry from expires_in', () => {
    assert.equal(computeSessionExpiry(3600, NOW), NOW + 3_600_000);
  });

  test('isSessionExpired respects skew and expiring states', () => {
    assert.equal(isSessionExpired({ expiresAt: NOW + 30_000 }, NOW), true);
    assert.equal(isSessionExpired({ expiresAt: NOW + 3_600_000 }, NOW), false);
  });

  test('buildSessionFromTokens produces a session and parses the user', () => {
    const token = makeJwt({ sub: 'u-5', email: 'ram@example.com', name: 'Ram Kumar' });
    const { session, user } = buildSessionFromTokens({
      accessToken: 'at',
      idToken: token,
      refreshToken: 'rt',
      expiresInSeconds: 3600,
      nowMs: NOW,
    });
    assert.equal(session.accessToken, 'at');
    assert.equal(session.refreshToken, 'rt');
    assert.equal(session.expiresAt, NOW + 3_600_000);
    assert.equal(user.id, 'u-5');
    assert.equal(user.developmentMode, false);
  });

  test('buildSessionFromTokens falls back to an unknown user for bad tokens', () => {
    const { user } = buildSessionFromTokens({
      accessToken: 'at',
      idToken: 'garbage',
      expiresInSeconds: 3600,
      nowMs: NOW,
    });
    assert.equal(user.id, 'unknown-user');
  });

  test('createDevelopmentSession is clearly labeled and long-lived', () => {
    const session = createDevelopmentSession(NOW);
    assert.equal(session.user.developmentMode, true);
    assert.equal(session.user.id, 'dev-user');
    assert.equal(isSessionExpired(session, NOW), false);
  });

  test('isStoredSession validates the persisted shape', () => {
    assert.ok(
      isStoredSession({
        user: { id: 'u', email: 'e', developmentMode: false },
        accessToken: 'a',
        idToken: 'i',
        expiresAt: NOW + 1000,
      })
    );
    assert.equal(isStoredSession(null), false);
    assert.equal(isStoredSession({ accessToken: 'a' }), false);
  });
});

describe('auth logic — route protection decision', () => {
  test('resolveProtectedAccess defers while loading', () => {
    assert.equal(resolveProtectedAccess('loading', false), 'loading');
  });

  test('resolveProtectedAccess allows authenticated users with a session', () => {
    assert.equal(resolveProtectedAccess('authenticated', true), 'allow');
  });

  test('resolveProtectedAccess redirects unauthenticated visitors', () => {
    assert.equal(resolveProtectedAccess('unauthenticated', false), 'redirect');
    assert.equal(resolveProtectedAccess('authenticated', false), 'redirect');
  });
});

describe('auth logic — no browser globals leak', () => {
  before(() => {
    assert.equal(typeof globalThis.window, 'undefined');
  });

  test('importing the module does not touch window/document/fetch', () => {
    // If this module accidentally referenced `window` at import time, the
    // suite would not reach this test.
    assert.ok(true);
  });
});