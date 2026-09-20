import {
  AuthConfig,
  AuthMode,
  AuthSession,
  AuthStatus,
  AuthUser,
  JwtPayload,
  PkcePair,
  SignInMode,
  StoredPkce,
} from './types';

/**
 * Pure, dependency-free auth logic.
 * Implemented without `import.meta`, `fetch`, or browser globals so it can be
 * unit-tested directly under `tsx --test`. All I/O lives in `auth.ts`.
 */

export const AUTHORIZE_PATH = '/oauth2/authorize';
export const TOKEN_PATH = '/oauth2/token';
export const LOGOUT_PATH = '/logout';

export const SESSION_STORAGE_KEY = 'civicvoice:auth-session';
export const NEXT_PATH_KEY = 'civicvoice:auth-next';
export const PKCE_STORAGE_KEY = 'civicvoice:auth-pkce';

export const DEFAULT_DEV_USER_ID = 'dev-user';
export const DEFAULT_DEV_EMAIL = 'operations@civicvoice.local';
export const DEFAULT_DEV_NAME = 'CivicVoice Operations';

/** A local, simulated account usable only when Cognito isn't configured. */
export interface DemoAccount {
  id: string;
  email: string;
  password: string;
  name: string;
  username: string;
  groups?: string[];
  roleHint?: string;
}

/** Credentials accepted by the development-mode sign-in form. */
export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    id: DEFAULT_DEV_USER_ID,
    email: DEFAULT_DEV_EMAIL,
    password: 'CivicVoice!2026',
    name: DEFAULT_DEV_NAME,
    username: 'operations-console',
    groups: ['ADMIN', 'AUTHORITY'],
    roleHint: 'civicvoice-operations',
  },
  {
    id: 'dev-officer',
    email: 'officer.priya@civicvoice.local',
    password: 'CivicVoice!2026',
    name: 'Priya Sharma (Demo Officer)',
    username: 'field-officer-priya',
    groups: ['FIELD_OFFICER'],
    roleHint: 'field-officer',
  },
];

export type DemoCredentialCheck =
  | { ok: true; account: DemoAccount }
  | { ok: false; message: string };

/** Validate the development-mode demo credentials (email is case-insensitive). */
export function validateDemoCredentials(email: string, password: string): DemoCredentialCheck {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return { ok: false, message: 'Enter your email address.' };
  }
  if (!password) {
    return { ok: false, message: 'Enter your password.' };
  }
  const account = DEMO_ACCOUNTS.find(
    (a) => a.email.toLowerCase() === normalizedEmail && a.password === password
  );
  if (!account) {
    return {
      ok: false,
      message: "That email and password don't match a demo account. Use the demo credentials below.",
    };
  }
  return { ok: true, account };
}

/** 60s of skew / slack when deciding whether a token needs refreshing. */
export const TOKEN_SKEW_MS = 60_000;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

/** Cryptographically random base64url string (43–128 chars, always unguessable). */
export function randomBase64Url(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes).slice(0, length);
}

/** Generate a PKCE verifier + S256 challenge pair. */
export async function generatePkce(): Promise<PkcePair> {
  const verifier = randomBase64Url(64);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: bytesToBase64Url(new Uint8Array(digest)) };
}

function encodeQuery(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

/** Build the Cognito hosted UI authorize URL for login or sign-up. */
export function buildAuthorizeUrl(
  cfg: AuthConfig,
  input: { mode: SignInMode; state: string; codeChallenge: string; redirectUri?: string }
): string {
  const redirectUri = input.redirectUri ?? cfg.redirectUri;
  const params: Record<string, string> = {
    response_type: 'code',
    client_id: cfg.clientId,
    redirect_uri: redirectUri,
    scope: cfg.scopes.join(' '),
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: 'S256',
  };
  if (input.mode === 'signup') {
    params.signUp = 'true';
  }
  const base = cfg.domain.replace(/\/+$/, '');
  return `${base}${AUTHORIZE_PATH}?${encodeQuery(params)}`;
}

/** Build the hosted UI logout URL (ends any Cognito cookies for this client). */
export function buildLogoutUrl(cfg: AuthConfig, logoutUri: string): string {
  const params: Record<string, string> = {
    client_id: cfg.clientId,
    logout_uri: logoutUri,
  };
  const base = cfg.domain.replace(/\/+$/, '');
  return `${base}${LOGOUT_PATH}?${encodeQuery(params)}`;
}

export interface CallbackParams {
  code: string | null;
  state: string | null;
  error: string | null;
  errorDescription: string | null;
}

/** Parse OAuth callback params from a raw query string (no leading `?`). */
export function parseCallbackParams(query: string): CallbackParams {
  const params = new URLSearchParams(query);
  return {
    code: params.get('code'),
    state: params.get('state'),
    error: params.get('error'),
    errorDescription: params.get('error_description'),
  };
}

/** Constant-time-ish string compare for the OAuth state check. */
export function statesMatch(expected: string | null, actual: string | null): boolean {
  if (!expected || !actual) return false;
  if (expected.length !== actual.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
  }
  return diff === 0;
}

function decodeSegment(segment: string): string {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return atob(padded);
}

/** Decode a JWT's payload (without validating the signature). */
export function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const segment = decodeSegment(parts[1]);
    const decoded = JSON.parse(segment) as JwtPayload;
    return decoded && typeof decoded === 'object' ? decoded : null;
  } catch {
    return null;
  }
}

/** Map a decoded Cognito ID-token payload onto our AuthUser shape. */
export function getUserFromIdToken(payload: JwtPayload | null): AuthUser | null {
  if (!payload?.sub) return null;
  const groups = Array.isArray(payload['cognito:groups'])
    ? payload['cognito:groups']
    : undefined;
  return {
    id: payload.sub,
    email: payload.email ?? '',
    emailVerified: payload.email_verified,
    name: payload.name,
    username: payload.username,
    groups,
    roleHint: typeof payload['custom:role'] === 'string' ? payload['custom:role'] : undefined,
    developmentMode: false,
  };
}

/** Epoch ms at which a token bundle with the given `expires_in` becomes stale. */
export function computeSessionExpiry(expiresInSeconds: number, nowMs: number): number {
  return nowMs + expiresInSeconds * 1000;
}

/** True when the access token has expired (or is within skew of expiring). */
export function isSessionExpired(session: Pick<AuthSession, 'expiresAt'>, nowMs: number): boolean {
  return nowMs + TOKEN_SKEW_MS >= session.expiresAt;
}

/** True when the session is close enough to expiry that a refresh is worthwhile. */
export function shouldRefresh(session: Pick<AuthSession, 'expiresAt'>, nowMs: number): boolean {
  return nowMs + 5 * 60_000 >= session.expiresAt;
}

/** Route-protection decision for /app/* routes. */
export function resolveProtectedAccess(status: AuthStatus, hasUser: boolean): 'loading' | 'redirect' | 'allow' {
  if (status === 'loading') return 'loading';
  if (status === 'authenticated' && hasUser) return 'allow';
  return 'redirect';
}

/**
 * Derive the single source-of-truth auth mode from provider state.
 * Signed out → null. Authenticated sessions split into 'cognito' vs 'demo'.
 */
export function deriveAuthMode(status: AuthStatus, user: AuthUser | null): AuthMode | null {
  if (status !== 'authenticated' || !user) return null;
  return user.developmentMode ? 'demo' : 'cognito';
}

/** Which case data source the app should use for the active auth mode. */
export function resolveCaseSource(authMode: AuthMode | null): 'demo' | 'backend' | 'none' {
  if (authMode === 'demo') return 'demo';
  if (authMode === 'cognito') return 'backend';
  return 'none';
}

/** Only safe single-segment internal paths may be used as redirect targets. */
export function isSafeInternalPath(path: string | undefined | null): path is string {
  return Boolean(path) && path!.length > 1 && path!.startsWith('/') && !path!.startsWith('//') && !(/[\r\n]/.test(path!));
}

/** Build the clearly-labeled development-mode session used when Cognito is not configured. */
export function createDevelopmentSession(nowMs: number, account: DemoAccount = DEMO_ACCOUNTS[0]): AuthSession {
  const idToken = 'dev.id.token';
  return {
    user: {
      id: account.id,
      email: account.email,
      name: account.name,
      username: account.username,
      groups: account.groups,
      roleHint: account.roleHint,
      developmentMode: true,
    },
    accessToken: 'dev.access.token',
    idToken,
    expiresAt: nowMs + 8 * 60 * 60 * 1000,
  };
}

/** Assemble an AuthSession from Cognito token responses. */
export function buildSessionFromTokens(input: {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresInSeconds: number;
  nowMs: number;
}): { session: AuthSession; user: AuthUser } {
  const payload = decodeJwtPayload(input.idToken);
  const user = getUserFromIdToken(payload) ?? {
    id: 'unknown-user',
    email: '',
    name: undefined,
    developmentMode: false,
  };
  const session: AuthSession = {
    user,
    accessToken: input.accessToken,
    idToken: input.idToken,
    refreshToken: input.refreshToken,
    expiresAt: computeSessionExpiry(input.expiresInSeconds, input.nowMs),
  };
  return { session, user };
}

/** Validate the shape of a stored session object loaded from storage. */
export function isStoredSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<AuthSession>;
  if (!s.user || typeof s.user !== 'object') return false;
  return typeof s.accessToken === 'string' && typeof s.idToken === 'string' && typeof s.expiresAt === 'number';
}

/** Serialize the PKCE pre-auth record. */
export function serializePkce(record: StoredPkce): string {
  return JSON.stringify(record);
}