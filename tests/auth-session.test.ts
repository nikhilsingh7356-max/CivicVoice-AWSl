import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  completeSignIn,
  initiateSignIn,
  restoreSession,
  signOut,
  writeDemoSession,
  clearAuthStorage,
  readStoredSession,
  StorageLike,
} from '../src/auth/auth.ts';
import {
  classifySignInFailure,
  DEMO_ACCOUNTS,
  decodeJwtPayload,
  DEMO_SESSION_STORAGE_KEY,
  getUserFromIdToken,
  NEXT_PATH_KEY,
  PKCE_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  serializePkce,
  validateAuthConfig,
} from '../src/auth/logic.ts';
import { AuthConfig } from '../src/auth/types.ts';

const NOW = 1_700_000_000_000;
const PKCE_TTL_MS = 10 * 60 * 1000;

const STATE = '0123456789abcdef';
const VERIFIER = 'v'.repeat(40);

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

function memoryStorage(seed: Record<string, string> = {}) {
  const store: Record<string, string> = { ...seed };
  const storage: StorageLike = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
  return { storage, store };
}

function okJsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function tokenResponseBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    access_token: 'access-token',
    id_token: makeJwt({ sub: 'u-1', email: 'a@example.com', email_verified: true, name: 'A' }),
    refresh_token: 'refresh-token',
    expires_in: 3600,
    ...overrides,
  };
}

function seededPkce(createdAtMs: number, state: string = STATE, verifier: string = VERIFIER) {
  return { [PKCE_STORAGE_KEY]: serializePkce({ state, verifier, createdAt: createdAtMs }) };
}

describe('completeSignIn — real Cognito success path', () => {
  test('exchanges the code with the CONFIGURED redirect URI and stores the session', async () => {
    const { storage, store } = memoryStorage({
      ...seededPkce(NOW - 60_000),
      [NEXT_PATH_KEY]: '/app/cases/CV-2026-001',
    });
    const captured = { url: null as string | null, body: null as string | null };

    const fetcher = async (input: string, init?: RequestInit) => {
      captured.url = input;
      captured.body = typeof init?.body === 'string' ? init.body : null;
      return okJsonResponse(tokenResponseBody());
    };

    const outcome = await completeSignIn(CONFIG, {
      search: `code=CODE123&state=${STATE}`,
      origin: 'http://localhost:3000',
      storage,
      nowMs: NOW,
      fetcher,
    });

    assert.equal(outcome.ok, true);
    if (outcome.ok) {
      assert.equal(outcome.user.id, 'u-1');
      assert.equal(outcome.user.developmentMode, false);
      assert.equal(outcome.next, '/app/cases/CV-2026-001');
    }

    assert.ok(captured.url?.endsWith('/oauth2/token'));
    const params = new URLSearchParams(captured.body ?? '');
    assert.equal(params.get('grant_type'), 'authorization_code');
    assert.equal(params.get('code'), 'CODE123');
    assert.equal(params.get('code_verifier'), VERIFIER);
    assert.equal(params.get('redirect_uri'), CONFIG.redirectUri);

    const session = readStoredSession(storage, NOW);
    assert.ok(session);
    assert.equal(session?.accessToken, 'access-token');
    assert.equal(session?.refreshToken, 'refresh-token');

    assert.equal(store[PKCE_STORAGE_KEY], undefined);
    assert.equal(store[NEXT_PATH_KEY], undefined);
    assert.equal(store[DEMO_SESSION_STORAGE_KEY], undefined);
  });

  test('respects a safe stored return path and falls back to /app otherwise', async () => {
    const noNext = memoryStorage({ ...seededPkce(NOW - 60_000) });
    const out1 = await completeSignIn(CONFIG, {
      search: `code=CODE&state=${STATE}`,
      origin: 'http://localhost:3000',
      storage: noNext.storage,
      nowMs: NOW,
      fetcher: async () => okJsonResponse(tokenResponseBody()),
    });
    assert.ok(out1.ok);
    if (out1.ok) assert.equal(out1.next, '/app');

    const evilNext = memoryStorage({
      ...seededPkce(NOW - 60_000),
      [NEXT_PATH_KEY]: 'https://evil.example.com/phish',
    });
    const out2 = await completeSignIn(CONFIG, {
      search: `code=CODE&state=${STATE}`,
      origin: 'http://localhost:3000',
      storage: evilNext.storage,
      nowMs: NOW,
      fetcher: async () => okJsonResponse(tokenResponseBody()),
    });
    assert.ok(out2.ok);
    if (out2.ok) assert.equal(out2.next, '/app');
  });
});

describe('completeSignIn — failure paths clean up and never write a session', () => {
  test('OAuth provider error returns oauth-denied and clears callback state', async () => {
    const { storage, store } = memoryStorage({
      ...seededPkce(NOW - 60_000),
      [NEXT_PATH_KEY]: '/app/cases',
    });
    let fetchCalled = false;
    const outcome = await completeSignIn(CONFIG, {
      search: 'error=access_denied&error_description=User+cancelled',
      origin: 'http://localhost:3000',
      storage,
      nowMs: NOW,
      fetcher: async () => {
        fetchCalled = true;
        return okJsonResponse({});
      },
    });

    assert.equal(outcome.ok, false);
    if (!outcome.ok) {
      assert.equal(outcome.reason, 'error');
      assert.equal(outcome.technical, 'User cancelled');
    }
    assert.equal(fetchCalled, false);
    assert.equal(store[PKCE_STORAGE_KEY], undefined);
    assert.equal(store[NEXT_PATH_KEY], undefined);
    assert.equal(store[SESSION_STORAGE_KEY], undefined);
  });

  test('state mismatch is rejected before any token request', async () => {
    const { storage, store } = memoryStorage(seededPkce(NOW - 60_000));
    let fetchCalled = false;
    const outcome = await completeSignIn(CONFIG, {
      search: 'code=CODE&state=WRONG',
      origin: 'http://localhost:3000',
      storage,
      nowMs: NOW,
      fetcher: async () => {
        fetchCalled = true;
        return okJsonResponse({});
      },
    });
    assert.ok(!outcome.ok);
    if (!outcome.ok) assert.equal(outcome.reason, 'state-mismatch');
    assert.equal(fetchCalled, false);
    assert.equal(store[PKCE_STORAGE_KEY], undefined);
  });

  test('expired PKCE record is rejected without exchanging the code', async () => {
    const { storage, store } = memoryStorage(seededPkce(NOW - (PKCE_TTL_MS + 60_000)));
    let fetchCalled = false;
    const outcome = await completeSignIn(CONFIG, {
      search: `code=CODE&state=${STATE}`,
      origin: 'http://localhost:3000',
      storage,
      nowMs: NOW,
      fetcher: async () => {
        fetchCalled = true;
        return okJsonResponse({});
      },
    });
    assert.ok(!outcome.ok);
    if (!outcome.ok) assert.equal(outcome.reason, 'pkce-expired');
    assert.equal(fetchCalled, false);
    assert.equal(store[PKCE_STORAGE_KEY], undefined);
    assert.equal(store[SESSION_STORAGE_KEY], undefined);
  });

  test('a callback with no PKCE record (stale/replayed) is treated as expired', async () => {
    const { storage } = memoryStorage();
    const outcome = await completeSignIn(CONFIG, {
      search: `code=CODE&state=${STATE}`,
      origin: 'http://localhost:3000',
      storage,
      nowMs: NOW,
      fetcher: async () => okJsonResponse({}),
    });
    assert.ok(!outcome.ok);
    if (!outcome.ok) assert.equal(outcome.reason, 'pkce-expired');
  });

  test('missing authorization code reports invalid-callback', async () => {
    const { storage, store } = memoryStorage(seededPkce(NOW - 60_000));
    const outcome = await completeSignIn(CONFIG, {
      search: `state=${STATE}`,
      origin: 'http://localhost:3000',
      storage,
      nowMs: NOW,
      fetcher: async () => okJsonResponse({}),
    });
    assert.ok(!outcome.ok);
    if (!outcome.ok) assert.equal(outcome.reason, 'invalid-callback');
    assert.equal(store[PKCE_STORAGE_KEY], undefined);
  });

  test('network failure during exchange reports network and cleans up', async () => {
    const { storage, store } = memoryStorage(seededPkce(NOW - 60_000));
    const outcome = await completeSignIn(CONFIG, {
      search: `code=CODE&state=${STATE}`,
      origin: 'http://localhost:3000',
      storage,
      nowMs: NOW,
      fetcher: async () => {
        throw new Error('socket hang up');
      },
    });
    assert.ok(!outcome.ok);
    if (!outcome.ok) {
      assert.equal(outcome.reason, 'network');
      assert.equal(outcome.technical, 'socket hang up');
    }
    assert.equal(store[PKCE_STORAGE_KEY], undefined);
    assert.equal(store[SESSION_STORAGE_KEY], undefined);
  });

  test('token response missing id_token is a network failure with no session written', async () => {
    const { storage, store } = memoryStorage(seededPkce(NOW - 60_000));
    const outcome = await completeSignIn(CONFIG, {
      search: `code=CODE&state=${STATE}`,
      origin: 'http://localhost:3000',
      storage,
      nowMs: NOW,
      fetcher: async () => okJsonResponse(tokenResponseBody({ id_token: undefined })),
    });
    assert.ok(!outcome.ok);
    if (!outcome.ok) {
      assert.equal(outcome.reason, 'network');
      assert.match(outcome.technical ?? '', /missing tokens/i);
    }
    assert.equal(store[SESSION_STORAGE_KEY], undefined);
  });

  test('token response with an undecodable id_token is a network failure', async () => {
    const { storage } = memoryStorage(seededPkce(NOW - 60_000));
    const outcome = await completeSignIn(CONFIG, {
      search: `code=CODE&state=${STATE}`,
      origin: 'http://localhost:3000',
      storage,
      nowMs: NOW,
      fetcher: async () => okJsonResponse(tokenResponseBody({ id_token: 'garbage' })),
    });
    assert.ok(!outcome.ok);
    if (!outcome.ok) assert.equal(outcome.reason, 'network');
  });
});

describe('completeSignIn — development mode (no Cognito)', () => {
  test('writes the demo slot only and never touches real Cognito storage', async () => {
    const { storage, store } = memoryStorage({
      ...seededPkce(NOW - 60_000),
      [NEXT_PATH_KEY]: '/app/report',
    });
    const outcome = await completeSignIn(
      { ...CONFIG, configured: false },
      {
        search: 'code=whatever&state=whatever',
        origin: 'http://localhost:3000',
        storage,
        nowMs: NOW,
        fetcher: async () => okJsonResponse({}),
      }
    );
    assert.ok(outcome.ok);
    if (outcome.ok) {
      assert.equal(outcome.developmentMode, true);
      assert.equal(outcome.user.id, 'dev-user');
      assert.equal(outcome.next, '/app/report');
    }
    assert.ok(store[DEMO_SESSION_STORAGE_KEY]);
    assert.equal(store[SESSION_STORAGE_KEY], undefined);
    assert.equal(store[PKCE_STORAGE_KEY], undefined);
    assert.equal(store[NEXT_PATH_KEY], undefined);
  });
});

describe('initiateSignIn — PKCE generation and return path', () => {
  test('configured mode persists PKCE with a created-at timestamp and the safe next path', async () => {
    const { storage, store } = memoryStorage();
    const captured = { url: null as string | null };
    const result = await initiateSignIn(CONFIG, 'login', {
      storage,
      win: {
        location: { assign: (url: string) => { captured.url = url; } },
        history: {},
      },
      next: '/app/cases',
    });

    assert.equal(result.dev, false);
    assert.ok(captured.url?.startsWith(`${CONFIG.domain}/oauth2/authorize?`));
    const urlParams = new URLSearchParams(captured.url?.split('?')[1] ?? '');
    assert.equal(urlParams.get('redirect_uri'), CONFIG.redirectUri);

    const storedPkce = JSON.parse(store[PKCE_STORAGE_KEY] as string);
    assert.ok(typeof storedPkce.createdAt === 'number' && storedPkce.createdAt > 0);
    assert.ok(storedPkce.state.length > 0);
    assert.ok(storedPkce.verifier.length > 40);
    assert.equal(store[NEXT_PATH_KEY], '/app/cases');
  });

  test('configured mode drops an unsafe next path but still writes PKCE', async () => {
    const { storage, store } = memoryStorage();
    let assigned: string | null = null;
    const result = await initiateSignIn(CONFIG, 'signup', {
      storage,
      win: {
        location: { assign: (url: string) => { assigned = url; } },
        history: {},
      },
      next: 'https://evil.example.com/phish',
    });

    assert.equal(result.dev, false);
    assert.ok(assigned);
    assert.ok(store[PKCE_STORAGE_KEY]);
    assert.equal(store[NEXT_PATH_KEY], undefined);
  });

  test('unconfigured mode writes the demo slot only and navigates to a safe target', async () => {
    const { storage, store } = memoryStorage();
    let assigned: string | null = null;
    const result = await initiateSignIn({ ...CONFIG, configured: false }, 'login', {
      storage,
      win: {
        location: { assign: (url: string) => { assigned = url; } },
        history: {},
      },
      next: '/app/report',
    });

    assert.equal(result.dev, true);
    assert.equal(assigned, '/app/report');
    assert.ok(store[DEMO_SESSION_STORAGE_KEY]);
    assert.equal(store[SESSION_STORAGE_KEY], undefined);
    assert.equal(store[PKCE_STORAGE_KEY], undefined);
  });
});

describe('storage slot isolation — real vs demo sessions', () => {
  test('a demo session never touches the real slot and vice-versa', async () => {
    const { storage, store } = memoryStorage();
    const demo = writeDemoSession(storage, DEMO_ACCOUNTS[0], NOW);
    assert.equal(demo.user.developmentMode, true);
    assert.ok(store[DEMO_SESSION_STORAGE_KEY]);
    assert.equal(store[SESSION_STORAGE_KEY], undefined);

    const { storage: storage2, store: store2 } = memoryStorage();
    writeDemoSession(storage2, DEMO_ACCOUNTS[0], NOW);
    storage2.setItem(PKCE_STORAGE_KEY, serializePkce({ state: STATE, verifier: VERIFIER, createdAt: NOW - 60_000 }));
    const outcome = await completeSignIn(CONFIG, {
      search: `code=CODE&state=${STATE}`,
      origin: 'http://localhost:3000',
      storage: storage2,
      nowMs: NOW,
      fetcher: async () => okJsonResponse(tokenResponseBody()),
    });
    assert.ok(outcome.ok);
    // The real write clears the demo slot, keeping exactly one canonical session.
    assert.ok(store2[SESSION_STORAGE_KEY]);
    assert.equal(store2[DEMO_SESSION_STORAGE_KEY], undefined);
  });

  test('clearAuthStorage removes real, demo, PKCE and return-path keys', async () => {
    const { storage, store } = memoryStorage({
      [SESSION_STORAGE_KEY]: JSON.stringify({ user: { id: 'u', developmentMode: false }, accessToken: 'a', idToken: 'i', expiresAt: 1 }),
      [DEMO_SESSION_STORAGE_KEY]: JSON.stringify({ user: { id: 'dev', developmentMode: true }, accessToken: 'd', idToken: 'd', expiresAt: 1 }),
      [PKCE_STORAGE_KEY]: '{"state":"s","verifier":"v"}',
      [NEXT_PATH_KEY]: '/app/cases',
    });
    clearAuthStorage(storage);
    assert.equal(store[SESSION_STORAGE_KEY], undefined);
    assert.equal(store[DEMO_SESSION_STORAGE_KEY], undefined);
    assert.equal(store[PKCE_STORAGE_KEY], undefined);
    assert.equal(store[NEXT_PATH_KEY], undefined);
  });

  test('signOut clears both slots before building the logout URL', () => {
    const { storage, store } = memoryStorage({
      [SESSION_STORAGE_KEY]: JSON.stringify({ user: { id: 'u', developmentMode: false }, accessToken: 'a', idToken: 'i', expiresAt: 1 }),
      [DEMO_SESSION_STORAGE_KEY]: JSON.stringify({ user: { id: 'dev', developmentMode: true }, accessToken: 'd', idToken: 'd', expiresAt: 1 }),
    });
    const result = signOut(CONFIG, { storage, origin: 'http://localhost:3000' });
    assert.equal(result.dev, false);
    assert.ok(result.url);
    assert.equal(store[SESSION_STORAGE_KEY], undefined);
    assert.equal(store[DEMO_SESSION_STORAGE_KEY], undefined);
  });
});

describe('restoreSession — precedence and refresh behavior', () => {
  function realSession(overrides: Record<string, unknown> = {}) {
    return {
      user: { id: 'u-real', email: 'real@example.com', developmentMode: false },
      accessToken: 'real-at',
      idToken: 'real-it',
      refreshToken: 'real-rt',
      expiresAt: NOW + 3_600_000,
      ...overrides,
    };
  }

  test('reports none when every storage slot is empty', async () => {
    const { storage } = memoryStorage();
    const result = await restoreSession(CONFIG, { storage, nowMs: NOW });
    assert.equal(result.kind, 'none');
  });

  test('demo slot wins over a real slot without touching the real slot', async () => {
    const { storage, store } = memoryStorage({
      [SESSION_STORAGE_KEY]: JSON.stringify(realSession()),
      [DEMO_SESSION_STORAGE_KEY]: JSON.stringify({
        user: { id: 'dev-user', email: DEMO_ACCOUNTS[0].email, developmentMode: true },
        accessToken: 'demo-at',
        idToken: 'demo-it',
        expiresAt: NOW + 3_600_000,
      }),
    });
    const result = await restoreSession(CONFIG, { storage, nowMs: NOW });
    assert.equal(result.kind, 'session');
    if (result.kind === 'session') {
      assert.equal(result.session.user.developmentMode, true);
      assert.equal(result.session.user.id, 'dev-user');
    }
    // Real slot stays intact and untouched.
    assert.ok(store[SESSION_STORAGE_KEY]);
  });

  test('a valid real session is restored without a refresh when inside the window', async () => {
    const seeded = realSession();
    const { storage } = memoryStorage({ [SESSION_STORAGE_KEY]: JSON.stringify(seeded) });
    const result = await restoreSession(CONFIG, { storage, nowMs: NOW });
    assert.equal(result.kind, 'session');
    if (result.kind === 'session') {
      assert.equal(result.session.accessToken, 'real-at');
      assert.equal(result.session.user.id, 'u-real');
    }
  });

  test('a nearly-expired real session is transparently refreshed', async () => {
    const { storage, store } = memoryStorage({
      [SESSION_STORAGE_KEY]: JSON.stringify(realSession({ expiresAt: NOW + 90_000 })),
    });
    let refreshCalled = false;
    const result = await restoreSession(CONFIG, {
      storage,
      nowMs: NOW,
      fetcher: async (input: string) => {
        refreshCalled = true;
        assert.ok(input.endsWith('/oauth2/token'));
        return okJsonResponse({
          access_token: 'rotated-at',
          id_token: makeJwt({ sub: 'u-real', email: 'real@example.com' }),
          expires_in: 3600,
        });
      },
    });
    assert.equal(refreshCalled, true);
    assert.equal(result.kind, 'session');
    if (result.kind === 'session') {
      assert.equal(result.session.accessToken, 'rotated-at');
      assert.equal(result.session.user.id, 'u-real');
    }
    const persisted = JSON.parse(store[SESSION_STORAGE_KEY] as string);
    assert.equal(persisted.accessToken, 'rotated-at');
    assert.equal(store[DEMO_SESSION_STORAGE_KEY], undefined);
  });

  test('a failed refresh reports refresh-failed and clears storage', async () => {
    const { storage, store } = memoryStorage({
      [SESSION_STORAGE_KEY]: JSON.stringify(realSession({ expiresAt: NOW + 90_000 })),
    });
    const result = await restoreSession(CONFIG, {
      storage,
      nowMs: NOW,
      fetcher: async () => new Response('invalid_grant', { status: 400 }),
    });
    assert.equal(result.kind, 'refresh-failed');
    assert.equal(store[SESSION_STORAGE_KEY], undefined);
    assert.equal(store[DEMO_SESSION_STORAGE_KEY], undefined);
  });

  test('an expired real session without refresh capability reports expired and clears', async () => {
    const { storage, store } = memoryStorage({
      [SESSION_STORAGE_KEY]: JSON.stringify(realSession({ expiresAt: NOW - 60_000 })),
    });
    const result = await restoreSession(CONFIG, { storage, nowMs: NOW });
    assert.equal(result.kind, 'expired');
    assert.equal(store[SESSION_STORAGE_KEY], undefined);
  });

  test('an expired demo session is renewed in place for the same account', async () => {
    const { storage, store } = memoryStorage({
      [DEMO_SESSION_STORAGE_KEY]: JSON.stringify({
        user: { id: 'dev-officer', email: DEMO_ACCOUNTS[1].email, developmentMode: true },
        accessToken: 'old',
        idToken: 'old',
        expiresAt: NOW - 60_000,
      }),
    });
    const result = await restoreSession(CONFIG, { storage, nowMs: NOW });
    assert.equal(result.kind, 'session');
    if (result.kind === 'session') {
      assert.equal(result.session.user.id, 'dev-officer');
      assert.ok(result.session.expiresAt > NOW);
    }
    const persisted = JSON.parse(store[DEMO_SESSION_STORAGE_KEY] as string);
    assert.equal(persisted.user.id, 'dev-officer');
    assert.equal(store[SESSION_STORAGE_KEY], undefined);
  });
});

describe('multi-user identity from ID tokens', () => {
  test('two different sub claims produce two distinct users (never a shared identity)', async () => {
    const userA = getUserFromIdToken(
      decodeJwtPayload(makeJwt({ sub: 'user-a', email: 'a@example.com', name: 'User A' }))
    );
    const userB = getUserFromIdToken(
      decodeJwtPayload(makeJwt({ sub: 'user-b', email: 'b@example.com', name: 'User B' }))
    );
    assert.ok(userA && userB);
    assert.notEqual(userA.id, userB.id);
    assert.notEqual(userA.email, userB.email);

    const storageA = memoryStorage(seededPkce(NOW - 60_000));
    const storageB = memoryStorage(seededPkce(NOW - 60_000));
    const a1 = await completeSignIn(CONFIG, {
      search: `code=AONE&state=${STATE}`,
      origin: 'http://localhost:3000',
      storage: storageA.storage,
      nowMs: NOW,
      fetcher: async () => okJsonResponse(tokenResponseBody({ id_token: makeJwt({ sub: 'user-a', email: 'a@example.com' }) })),
    });
    const b1 = await completeSignIn(CONFIG, {
      search: `code=BTWO&state=${STATE}`,
      origin: 'http://localhost:3000',
      storage: storageB.storage,
      nowMs: NOW,
      fetcher: async () => okJsonResponse(tokenResponseBody({ id_token: makeJwt({ sub: 'user-b', email: 'b@example.com' }) })),
    });
    assert.ok(a1.ok && b1.ok);
    if (a1.ok && b1.ok) {
      assert.equal(a1.user.id, 'user-a');
      assert.equal(b1.user.id, 'user-b');
      assert.notEqual(a1.user.id, b1.user.id);
    }

    const restoredA = await restoreSession(CONFIG, { storage: storageA.storage, nowMs: NOW });
    assert.equal(restoredA.kind, 'session');
    if (restoredA.kind === 'session') assert.equal(restoredA.session.user.id, 'user-a');
  });

  test('getUserFromIdToken falls back to username then preferred_username', () => {
    const fromCognitoUsername = getUserFromIdToken(
      decodeJwtPayload(makeJwt({ sub: 'u-1', email: 'x@y.test', 'cognito:username': 'alice' }))
    );
    assert.equal(fromCognitoUsername?.username, 'alice');

    const fromPreferred = getUserFromIdToken(
      decodeJwtPayload(makeJwt({ sub: 'u-2', email: 'y@z.test', preferred_username: 'bob' }))
    );
    assert.equal(fromPreferred?.username, 'bob');
  });
});

describe('config validation', () => {
  test('a fully populated config returns no errors', () => {
    const errors = validateAuthConfig({
      userPoolId: 'ap-south-1_AbCdEf12',
      clientId: 'clientabc123',
      domain: 'https://civicvoice-auth.auth.ap-south-1.amazoncognito.com',
      redirectUri: 'http://localhost:3000/auth/callback',
      scopes: ['openid', 'profile', 'email'],
      configured: false,
    });
    assert.deepEqual(errors, []);
  });

  test('incomplete configuration lists every offending field', () => {
    const errors = validateAuthConfig({
      userPoolId: '',
      clientId: '',
      domain: '',
      redirectUri: '',
      scopes: ['openid'],
      configured: false,
    });
    assert.ok(errors.length >= 4);
    assert.ok(errors.some((e) => /domain/i.test(e)));
    assert.ok(errors.some((e) => /client id/i.test(e)));
    assert.ok(errors.some((e) => /pool.?id/i.test(e)));
    assert.ok(errors.some((e) => /redirect/i.test(e)));
  });

  test('a localhost redirect must still end in /auth/callback', () => {
    const errors = validateAuthConfig({
      userPoolId: 'ap-south-1_AbCdEf12',
      clientId: 'clientabc123',
      domain: 'https://civicvoice-auth.auth.ap-south-1.amazoncognito.com',
      redirectUri: 'http://localhost:3000',
      scopes: ['openid'],
      configured: false,
    });
    assert.ok(errors.some((e) => /redirect/i.test(e)));
  });

  test('a non-Cognito domain is rejected', () => {
    const errors = validateAuthConfig({
      userPoolId: 'ap-south-1_AbCdEf12',
      clientId: 'clientabc123',
      domain: 'https://evil.example.com',
      redirectUri: 'http://localhost:3000/auth/callback',
      scopes: ['openid'],
      configured: false,
    });
    assert.ok(errors.some((e) => /cognito/i.test(e)));
  });
});

describe('sign-in failure classification', () => {
  test('maps state, expiry, callback and network reasons to safe messages', () => {
    assert.equal(classifySignInFailure('state-mismatch').code, 'state-mismatch');
    assert.equal(classifySignInFailure('pkce-expired').code, 'pkce-expired');
    assert.equal(classifySignInFailure('invalid-callback').code, 'invalid-callback');
    assert.equal(classifySignInFailure('network').code, 'token-exchange-failed');
  });

  test('a user cancellation is distinct from a generic provider error', () => {
    const cancelled = classifySignInFailure('error', 'User cancelled / access_denied');
    assert.equal(cancelled.code, 'oauth-denied');
    assert.match(cancelled.message, /cancelled/i);
  });

  test('oauth errors are never surfaced as credentials or tokens', () => {
    const err = classifySignInFailure('error', 'authorization_code exchange failed: invalid_grant');
    assert.doesNotMatch(err.message, /access_token|id_token|refresh_token/i);
  });
});