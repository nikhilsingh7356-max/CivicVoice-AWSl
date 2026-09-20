import { AuthConfig } from './types';

/**
 * Read the public Cognito configuration from VITE_ environment variables.
 * These are all public values — never put secrets here.
 */
export function loadAuthConfig(env: Record<string, string | undefined>): AuthConfig {
  const userPoolId = env.VITE_COGNITO_USER_POOL_ID?.trim() ?? '';
  const clientId = env.VITE_COGNITO_CLIENT_ID?.trim() ?? '';
  const domain = env.VITE_COGNITO_DOMAIN?.trim() ?? '';
  const redirectUri = env.VITE_COGNITO_REDIRECT_URI?.trim() ?? '';

  return {
    userPoolId,
    clientId,
    domain,
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
    configured: Boolean(userPoolId && clientId && domain && redirectUri),
  };
}

export const authConfig: AuthConfig = loadAuthConfig(import.meta.env as Record<string, string | undefined>);

export const isCognitoConfigured = (): boolean => authConfig.configured;