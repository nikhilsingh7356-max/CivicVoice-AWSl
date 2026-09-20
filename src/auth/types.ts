export interface AuthUser {
  /** Cognito `sub` claim — stable user identifier. */
  id: string;
  email: string;
  emailVerified?: boolean;
  name?: string;
  /** Cognito `cognito:username`. */
  username?: string;
  /** Cognito groups (e.g. CITIZEN, FIELD_OFFICER, AUTHORITY, ADMIN) — advisory only. */
  groups?: string[];
  /** Optional custom:role claim — advisory only; the backend enforces authorization. */
  roleHint?: string;
  /** True when a clearly-labeled development session is active (no Cognito). */
  developmentMode: boolean;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  /** Epoch ms when the access token expires. */
  expiresAt: number;
}

export interface AuthConfig {
  userPoolId: string;
  clientId: string;
  /** Full hosted UI domain, e.g. https://civicvoice-auth.auth.ap-south-1.amazoncognito.com */
  domain: string;
  /** SPA base URL, e.g. https://app.example.com */
  redirectUri: string;
  scopes: string[];
  configured: boolean;
}

export interface JwtPayload {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  username?: string;
  exp?: number;
  iat?: number;
  iss?: string;
  'cognito:groups'?: string[];
  'custom:role'?: string;
  [key: string]: unknown;
}

export interface PkcePair {
  verifier: string;
  challenge: string;
}

export type SignInMode = 'login' | 'signup';

export type SignInOutcome =
  | { ok: true; user: AuthUser; next: string; developmentMode: boolean }
  | { ok: false; reason: 'state-mismatch' | 'error' | 'network'; message: string; technical?: string };

export interface StoredPkce {
  state: string;
  verifier: string;
}