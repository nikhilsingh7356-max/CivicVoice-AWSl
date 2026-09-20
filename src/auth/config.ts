import { AuthConfig } from './types';
import { validateAuthConfig } from './logic';

/**
 * Read the public Cognito configuration from VITE_ environment variables.
 * These are all public values — never put secrets here.
 */
export function loadAuthConfig(env: Record<string, string | undefined>): AuthConfig {
  const userPoolId = env.VITE_COGNITO_USER_POOL_ID?.trim() ?? '';
  const clientId = env.VITE_COGNITO_CLIENT_ID?.trim() ?? '';
  const domain = env.VITE_COGNITO_DOMAIN?.trim() ?? '';
  const redirectUri = env.VITE_COGNITO_REDIRECT_URI?.trim() ?? '';

  const config: AuthConfig = {
    userPoolId,
    clientId,
    domain,
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
    configured: false,
  };

  const errors = validateAuthConfig(config);
  config.configured = errors.length === 0;
  return config;
}

export const authConfig: AuthConfig = loadAuthConfig(import.meta.env as Record<string, string | undefined>);

/** Human-readable configuration problems (safe, non-secret) for diagnostics. */
export const authConfigErrors: string[] = validateAuthConfig(authConfig);

export const isCognitoConfigured = (): boolean => authConfig.configured;

/** Development-only diagnostic: why Cognito is unavailable, without logging secrets. */
export function describeAuthConfigProblem(): string | null {
  if (authConfigErrors.length === 0) return null;
  return authConfigErrors.join(' ');
}