import { AuthConfig, AuthSession, SignInMode, SignInOutcome, StoredPkce } from './types';
import {
  AUTHORIZE_PATH,
  NEXT_PATH_KEY,
  PKCE_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  buildAuthorizeUrl,
  buildLogoutUrl,
  buildSessionFromTokens,
  generatePkce,
  createDevelopmentSession,
  DemoAccount,
  isSessionExpired,
  isStoredSession,
  parseCallbackParams,
  serializePkce,
  shouldRefresh,
  statesMatch,
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

type WindowLike = Pick<Window, 'location' | 'history'>;

export interface InitiateSignInResult {
  dev: boolean;
  error?: string;
}

/** Read the stored session from session storage (validated). */
export function readStoredSession(storage: StorageLike, nowMs: number): AuthSession | null {
  const raw = storage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredSession(parsed)) return null;
    return parsed;
  } catch {
    storage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

/** Persist a session (used by dev mode + restore after refresh). */
export function writeStoredSession(storage: StorageLike, session: AuthSession): void {
  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

/** Persist a validated development-mode session for the given demo account. */
export function writeDemoSession(storage: StorageLike, account: DemoAccount, nowMs: number): AuthSession {
  const session = createDevelopmentSession(nowMs, account);
  writeStoredSession(storage, session);
  return session;
}

/** Clear every auth-related storage entry used by this session. */
export function clearAuthStorage(storage: StorageLike): void {
  storage.removeItem(SESSION_STORAGE_KEY);
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
  }
): Promise<InitiateSignInResult> {
  const { storage, win, next } = input;
  if (!cfg.configured) {
    writeStoredSession(storage, createDevelopmentSession(Date.now()));
    const target = next ?? '/app';
    win.location.assign(target);
    return { dev: true };
  }
  try {
    const { verifier, challenge } = await generatePkce();
    const state = verifier.slice(0, 32);
    const pkceRecord: StoredPkce = { state, verifier };
    storage.setItem(PKCE_STORAGE_KEY, serializePkce(pkceRecord));
    if (next) storage.setItem(NEXT_PATH_KEY, next);
    const url = buildAuthorizeUrl(cfg, { mode, state, codeChallenge: challenge });
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
  return {
    accessToken: t.access_token,
    idToken: t.id_token,
    refreshToken: t.refresh_token ?? undefined,
    expiresIn: typeof t.expires_in === 'number' ? t.expires_in : 3600,
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
  const { search, origin, storage, nowMs } = input;
  const fetcher: FetchLike = input.fetcher ?? ((...args) => fetch(...args));
  const params = parseCallbackParams(search.replace(/^\?/, ''));

  const devNext = storage.getItem(NEXT_PATH_KEY) ?? '/app';

  if (!cfg.configured) {
    writeStoredSession(storage, createDevelopmentSession(nowMs));
    storage.removeItem(NEXT_PATH_KEY);
    return { ok: true, user: createDevelopmentSession(nowMs).user, next: devNext, developmentMode: true };
  }

  if (params.error) {
    return {
      ok: false,
      reason: 'error',
      message: 'We couldn\'t sign you in. Please try again.',
      technical: params.errorDescription ?? params.error,
    };
  }

  const storedRaw = storage.getItem(PKCE_STORAGE_KEY);
  let record: StoredPkce | null = null;
  try {
    record = storedRaw ? (JSON.parse(storedRaw) as StoredPkce) : null;
  } catch {
    record = null;
  }

  if (!params.code) {
    return { ok: false, reason: 'error', message: 'We couldn\'t sign you in. Please try again.' };
  }
  if (!record || !statesMatch(record.state, params.state)) {
    return { ok: false, reason: 'state-mismatch', message: 'We couldn\'t sign you in. Please try again.' };
  }

  const redirectUri = `${origin}/auth/callback`;
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
    storage.removeItem(PKCE_STORAGE_KEY);
    const next = storage.getItem(NEXT_PATH_KEY) ?? '/app';
    storage.removeItem(NEXT_PATH_KEY);
    return { ok: true, user: session.user, next, developmentMode: false };
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      message: 'Unable to connect to CivicVoice.',
      technical: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Restore the session on application load, transparently refreshing an
 * expiring access token when a refresh token is available.
 */
export async function restoreSession(
  cfg: AuthConfig,
  input: { storage: StorageLike; nowMs: number; fetcher?: FetchLike }
): Promise<AuthSession | null> {
  const { storage, nowMs } = input;
  const session = readStoredSession(storage, nowMs);
  if (!session) return null;

  if (session.user.developmentMode) {
    if (isSessionExpired(session, nowMs)) {
      const fresh = createDevelopmentSession(nowMs);
      writeStoredSession(storage, fresh);
      return fresh;
    }
    return session;
  }

  if (!isSessionExpired(session, nowMs)) {
    if (shouldRefresh(session, nowMs) && session.refreshToken && cfg.configured) {
      const fetcher: FetchLike = input.fetcher ?? ((...args) => fetch(...args));
      const refreshed = await refreshTokens(cfg, {
        refreshToken: session.refreshToken,
        redirectUri: `${window.location.origin}/auth/callback`,
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
        return updated;
      }
    }
    return session;
  }

  // Token is expired and cannot be refreshed — drop the local session.
  clearAuthStorage(storage);
  return null;
}

/** Clear the local session and end the Cognito hosted session (if configured). */
export function signOut(
  cfg: AuthConfig,
  input: { storage: StorageLike; origin: string }
): { dev: boolean; url?: string } {
  const { storage, origin } = input;
  clearAuthStorage(storage);
  if (!cfg.configured) {
    return { dev: true };
  }
  return { dev: false, url: buildLogoutUrl(cfg, `${origin}/`) };
}

/** Convenience: read the stored return path (used by the callback entry screen). */
export function readDevNext(storage: StorageLike): string {
  return storage.getItem(NEXT_PATH_KEY) ?? '/app';
}

export { AUTHORIZE_PATH };