import { AuthConfig, AuthSession, RestoreResult, SignInMode, SignInOutcome, StoredPkce } from './types';
import {
  AUTHORIZE_PATH,
  DEMO_SESSION_STORAGE_KEY,
  NEXT_PATH_KEY,
  PKCE_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  buildAuthorizeUrl,
  buildLogoutUrl,
  buildSessionFromTokens,
  decodeJwtPayload,
  generatePkce,
  createDevelopmentSession,
  DEMO_ACCOUNTS,
  DemoAccount,
  isPkceUsable,
  isSessionExpired,
  isStoredSession,
  isSafeInternalPath,
  parseCallbackParams,
  serializePkce,
  shouldRefresh,
  statesMatch,
  resolveCallbackUri,
  TOKEN_PATH,
} from './logic';

/**
 * Concrete auth orchestration. Browser-only — depends on `fetch`, `window`,
 * and `sessionStorage`. Never put secrets here; all Cognito values are public.
 */

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface FetchLike {
  (input: string, init?: RequestInit): Promise<Response>;
}

type WindowLike = {
  location: {
    assign(url: string): void;
    /** Present on real `window.location`; used by DEV-only redirect diagnostics. */
    origin?: string;
  };
  history?: unknown;
};

export interface InitiateSignInResult {
  dev: boolean;
  error?: string;
}

/** Read a session from a specific storage slot (validated). */
function readStoredSessionAt(storage: StorageLike, key: string, nowMs: number): AuthSession | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredSession(parsed)) return null;
    return parsed;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

/** Read the persisted real Cognito session from its slot. */
export function readStoredSession(storage: StorageLike, nowMs: number): AuthSession | null {
  return readStoredSessionAt(storage, SESSION_STORAGE_KEY, nowMs);
}

/** Write into the real Cognito slot and drop any demo slot so exactly one session is canonical. */
function writeStoredSession(storage: StorageLike, session: AuthSession): void {
  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  storage.removeItem(DEMO_SESSION_STORAGE_KEY);
}

/** Persist a validated development-mode session in its own slot (never touches real Cognito storage). */
export function writeDemoSession(storage: StorageLike, account: DemoAccount, nowMs: number): AuthSession {
  const session = createDevelopmentSession(nowMs, account);
  storage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(session));
  storage.removeItem(PKCE_STORAGE_KEY);
  storage.removeItem(NEXT_PATH_KEY);
  return session;
}

/** Clear every auth-related storage entry used by this session (real, demo, PKCE, return path). */
export function clearAuthStorage(storage: StorageLike): void {
  storage.removeItem(SESSION_STORAGE_KEY);
  storage.removeItem(DEMO_SESSION_STORAGE_KEY);
  storage.removeItem(PKCE_STORAGE_KEY);
  storage.removeItem(NEXT_PATH_KEY);
}

/**
 * Start sign-in:
 * - With Cognito configured: generate PKCE, store it and the return path, then
 *   redirect to the hosted UI.
 * - Otherwise (development mode): create a clearly-labeled local session so the
 *   app remains runnable without AWS.
 */
export async function initiateSignIn(
  cfg: AuthConfig,
  mode: SignInMode,
  input: {
    storage: StorageLike;
    win: WindowLike;
    next?: string;
    fetcher?: FetchLike;
    /** Optional receiver for the built authorize URL (for DEV-only diagnostics). */
    onAuthorizeUrl?: (url: string) => void;
  }
): Promise<InitiateSignInResult> {
  const { storage, win, next } = input;
  if (!cfg.configured) {
    writeDemoSession(storage, DEMO_ACCOUNTS[0], Date.now());
    const target = isSafeInternalPath(next) ? next : '/app';
    win.location.assign(target);
    return { dev: true };
  }
  try {
    const { verifier, challenge } = await generatePkce();
    const state = verifier.slice(0, 32);
    const pkceRecord: StoredPkce = { state, verifier, createdAt: Date.now() };
    storage.setItem(PKCE_STORAGE_KEY, serializePkce(pkceRecord));
    if (isSafeInternalPath(next)) storage.setItem(NEXT_PATH_KEY, next);
    const url = buildAuthorizeUrl(cfg, {
      mode,
      state,
      codeChallenge: challenge,
      // Environment selector: explicit redirect (custom domain) or the running
      // origin's /auth/callback (production vs localhost). Never a hardcoded mix.
      redirectUri: resolveCallbackUri(cfg, win.location.origin),
    });
    input.onAuthorizeUrl?.(url);
    win.location.assign(url);
    return { dev: false };
  } catch (err) {
    return { dev: false, error: err instanceof Error ? err.message : 'Unable to start sign-in.' };
  }
}

async function exchangeCodeForTokens(
  cfg: AuthConfig,
  input: { code: string; verifier: string; redirectUri: string; fetcher: FetchLike }
): Promise<{ accessToken: string; idToken: string; refreshToken?: string; expiresIn: number }> {
  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('client_id', cfg.clientId);
  body.set('code', input.code);
  body.set('redirect_uri', input.redirectUri);
  body.set('code_verifier', input.verifier);
  body.set('scope', cfg.scopes.join(' '));

  const response = await input.fetcher(`${cfg.domain.replace(/\/+$/, '')}${TOKEN_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const err = (data as { error_description?: string; error?: string } | null) ?? null;
    const detail = err?.error_description ?? err?.error ?? `HTTP ${response.status}`;
    throw new Error(detail);
  }

  const t = data as {
    access_token?: string;
    id_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!t.access_token || !t.id_token) {
    throw new Error('Token response was missing tokens.');
  }
  const payload = decodeJwtPayload(t.id_token);
  if (!payload?.sub) {
    throw new Error('Token response contained an invalid id_token.');
  }
  if (typeof t.expires_in !== 'number' || t.expires_in <= 0) {
    throw new Error('Token response contained an invalid expiry.');
  }
  return {
    accessToken: t.access_token,
    idToken: t.id_token,
    refreshToken: t.refresh_token ?? undefined,
    expiresIn: t.expires_in,
  };
}

async function refreshTokens(
  cfg: AuthConfig,
  input: { refreshToken: string; fetcher: FetchLike; redirectUri: string }
): Promise<{ accessToken: string; idToken: string; expiresIn: number } | null> {
  const body = new URLSearchParams();
  body.set('grant_type', 'refresh_token');
  body.set('client_id', cfg.clientId);
  body.set('refresh_token', input.refreshToken);
  body.set('redirect_uri', input.redirectUri);

  const response = await input.fetcher(`${cfg.domain.replace(/\/+$/, '')}${TOKEN_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!response.ok) return null;
  const data: unknown = await response.json().catch(() => null);
  const t = data as { access_token?: string; id_token?: string; expires_in?: number } | null;
  if (!t?.access_token) return null;
  return {
    accessToken: t.access_token,
    idToken: t.id_token ?? '',
    expiresIn: typeof t.expires_in === 'number' ? t.expires_in : 3600,
  };
}

/**
 * Complete the OAuth callback. Returns a normalized outcome and (when reading a
 * real code from Cognito) the path the user originally intended to reach.
 *
 * The authorization code is processed exactly once per sign-in:
 * - On success the PKCE record and return path are removed.
 * - On ANY failure the PKCE record is removed, so a stale code can never be
 *   exchanged twice and revisiting the callback URL cannot replay it.
 */
export async function completeSignIn(
  cfg: AuthConfig,
  input: {
    search: string;
    origin: string;
    storage: StorageLike;
    nowMs: number;
    fetcher?: FetchLike;
  }
): Promise<SignInOutcome> {
  const { search, storage, nowMs } = input;
  const fetcher: FetchLike = input.fetcher ?? ((...args) => fetch(...args));
  const params = parseCallbackParams(search.replace(/^\?/, ''));

  const devNextRaw = storage.getItem(NEXT_PATH_KEY) ?? '/app';
  const devNext = isSafeInternalPath(devNextRaw) ? devNextRaw : '/app';

  if (!cfg.configured) {
    writeDemoSession(storage, DEMO_ACCOUNTS[0], nowMs);
    return { ok: true, user: createDevelopmentSession(nowMs).user, next: devNext, developmentMode: true };
  }

  const clearCallbackState = () => {
    storage.removeItem(PKCE_STORAGE_KEY);
    storage.removeItem(NEXT_PATH_KEY);
  };

  if (params.error) {
    clearCallbackState();
    return {
      ok: false,
      reason: 'error',
      message: 'We couldn\'t sign you in. Please try again.',
      technical: params.errorDescription ?? params.error,
    };
  }

  let record: StoredPkce | null = null;
  if (!params.code) {
    clearCallbackState();
    return { ok: false, reason: 'invalid-callback', message: 'The sign-in callback is missing an authorization code.' };
  }

  const storedRaw = storage.getItem(PKCE_STORAGE_KEY);
  try {
    record = storedRaw ? (JSON.parse(storedRaw) as StoredPkce) : null;
  } catch {
    record = null;
  }

  if (!record || !isPkceUsable(record, nowMs)) {
    clearCallbackState();
    return { ok: false, reason: 'pkce-expired', message: 'The sign-in request expired. Please start again.' };
  }
  if (!statesMatch(record.state, params.state)) {
    clearCallbackState();
    return { ok: false, reason: 'state-mismatch', message: 'The sign-in request didn\'t match. Please try again.' };
  }

  // The redirect_uri used in the token exchange must EXACTLY match the one sent
  // to /oauth2/authorize. Resolve it the same way the authorize step did (an
  // explicit configured redirect, otherwise the app origin's /auth/callback).
  const redirectUri = resolveCallbackUri(cfg, input.origin);
  try {
    const tokens = await exchangeCodeForTokens(cfg, {
      code: params.code,
      verifier: record.verifier,
      redirectUri,
      fetcher,
    });
    const { session } = buildSessionFromTokens({
      accessToken: tokens.accessToken,
      idToken: tokens.idToken,
      refreshToken: tokens.refreshToken,
      expiresInSeconds: tokens.expiresIn,
      nowMs,
    });
    writeStoredSession(storage, session);
    const storedNext = storage.getItem(NEXT_PATH_KEY);
    clearCallbackState();
    const next = isSafeInternalPath(storedNext) ? storedNext : '/app';
    return { ok: true, user: session.user, next, developmentMode: false };
  } catch (err) {
    clearCallbackState();
    return {
      ok: false,
      reason: 'network',
      message: 'Unable to connect to CivicVoice.',
      technical: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Restore the session on application load.
 *
 * Precedence: a development (demo) session in its own storage slot wins over a
 * real Cognito session, and the two NEVER share a slot. Real sessions are
 * transparently refreshed (access token rotation) when within the refresh
 * window; a session that can no longer be restored is reported explicitly so
 * the UI can say "session expired" instead of silently dropping the user.
 */
export async function restoreSession(
  cfg: AuthConfig,
  input: { storage: StorageLike; nowMs: number; origin?: string; fetcher?: FetchLike }
): Promise<RestoreResult> {
  const { storage, nowMs } = input;

  const demo = readStoredSessionAt(storage, DEMO_SESSION_STORAGE_KEY, nowMs);
  if (demo?.user.developmentMode) {
    if (isSessionExpired(demo, nowMs)) {
      const account = DEMO_ACCOUNTS.find((a) => a.id === demo.user.id) ?? DEMO_ACCOUNTS[0];
      const fresh = createDevelopmentSession(nowMs, account);
      storage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(fresh));
      return { kind: 'session', session: fresh };
    }
    return { kind: 'session', session: demo };
  }

  const session = readStoredSession(storage, nowMs);
  if (!session) return { kind: 'none' };

  if (!isSessionExpired(session, nowMs)) {
    if (shouldRefresh(session, nowMs) && session.refreshToken && cfg.configured) {
      const fetcher: FetchLike = input.fetcher ?? ((...args) => fetch(...args));
      const refreshed = await refreshTokens(cfg, {
        refreshToken: session.refreshToken,
        redirectUri: resolveCallbackUri(cfg, input.origin ?? ''),
        fetcher,
      });
      if (refreshed) {
        const { session: updated } = buildSessionFromTokens({
          accessToken: refreshed.accessToken,
          idToken: refreshed.idToken,
          refreshToken: session.refreshToken,
          expiresInSeconds: refreshed.expiresIn,
          nowMs,
        });
        writeStoredSession(storage, updated);
        return { kind: 'session', session: updated };
      }
      clearAuthStorage(storage);
      return { kind: 'refresh-failed' };
    }
    return { kind: 'session', session };
  }

  // Token is expired and cannot be refreshed — drop the local session.
  clearAuthStorage(storage);
  return { kind: 'expired' };
}

/**
 * Clear the local session and end the Cognito hosted session (if configured).
 *
 * The `logout_uri` must exactly match one of the app client's configured logout
 * URLs. `window.location.origin` (scheme + host + port) never carries a
 * trailing slash, so it matches an app client configured with e.g.
 * `http://localhost:3000` exactly.
 */
export function signOut(
  cfg: AuthConfig,
  input: { storage: StorageLike; origin: string }
): { dev: boolean; url?: string } {
  const { storage, origin } = input;
  clearAuthStorage(storage);
  if (!cfg.configured) {
    return { dev: true };
  }
  const logoutUri = origin.replace(/\/+$/, '');
  return { dev: false, url: buildLogoutUrl(cfg, logoutUri) };
}

/** Convenience: read the stored return path (used by the callback entry screen). */
export function readDevNext(storage: StorageLike): string {
  return storage.getItem(NEXT_PATH_KEY) ?? '/app';
}

export { AUTHORIZE_PATH };