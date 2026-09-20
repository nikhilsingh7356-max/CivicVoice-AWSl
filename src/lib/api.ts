/**
 * Centralized API URL construction + safe fetch for CivicVoice.
 *
 * All application API requests must go through `apiUrl()` so that:
 * - the API Gateway base (VITE_API_BASE_URL) is used in production,
 * - relative /api/... relative paths keep working for local development,
 * - a missing production API base fails loudly instead of silently hitting
 *   the Amplify SPA origin and parsing HTML as JSON.
 */

/** Resolve the configured API Gateway base URL from Vite env (trimmed). */
function readApiBaseUrl(): string {
  const env = (import.meta as unknown as { env?: Record<string, unknown> }).env;
  const raw = typeof env?.VITE_API_BASE_URL === 'string' ? env.VITE_API_BASE_URL : '';
  return raw.trim().replace(/\/+$/, '');
}

/** True when running a production build (vite build). Absent under tsx tests. */
function readIsProduction(): boolean {
  const env = (import.meta as unknown as { env?: Record<string, unknown> }).env;
  const prod = env?.PROD;
  return prod === true || prod === 'true';
}

/** Configured API Gateway base URL (no trailing slash, '' when unset). */
export const API_BASE_URL: string = readApiBaseUrl();

/** True in production builds (vite build). */
export const IS_PRODUCTION_BUILD: boolean = readIsProduction();

/**
 * Pure URL joiner — no env access, fully unit-testable.
 *
 * - Trims trailing slashes from the base URL.
 * - Trims leading slashes from the path.
 * - Never produces a double slash at the seam.
 * - Preserves query strings (everything from the first `?` on the path).
 * - When no base URL is available: returns the relative path unchanged for
 *   local development, or THROWS in production so a misconfigured deploy
 *   fails clearly instead of hitting the Amplify SPA origin.
 */
export function resolveApiUrl(baseUrl: string, isProduction: boolean, path: string): string {
  if (!baseUrl) {
    if (isProduction) {
      throw new Error(
        'VITE_API_BASE_URL is not configured. Set it to the API Gateway URL ' +
          '(e.g. https://w2o3ktyph9.execute-api.ap-south-1.amazonaws.com/Prod) in the ' +
          'Amplify environment variables and rebuild before making API calls.'
      );
    }
    // Local development: same-origin relative /api/... (vite dev or the bundled
    // node server on PORT) — the established dev behavior.
    return path.startsWith('/') ? path : `/${path}`;
  }
  const cleanPath = path.replace(/^\/+/, '');
  return `${baseUrl.replace(/\/+$/, '')}/${cleanPath}`;
}

/** Build a full API URL for the given API path (e.g. `/api/cases`). */
export function apiUrl(path: string): string {
  return resolveApiUrl(API_BASE_URL, IS_PRODUCTION_BUILD, path);
}

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export async function safeApiFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type') || '';

    let parsedData: any = null;
    let rawText = '';

    if (contentType.includes('application/json')) {
      try {
        parsedData = await response.json();
      } catch (jsonErr: any) {
        return {
          ok: false,
          status: response.status,
          error: `Malformed JSON response from server: ${jsonErr.message}`,
        };
      }
    } else {
      rawText = await response.text();
    }

    if (!response.ok) {
      // Determine helpful user-facing error message
      let errorMsg = parsedData?.error || parsedData?.details || parsedData?.message;
      if (!errorMsg) {
        if (response.status === 404) {
          errorMsg = `API route not found (${response.status}). Ensure the AWS API/Lambda server is running and the API route is configured.`;
        } else if (response.status === 504 || response.status === 502) {
          errorMsg = `Server gateway timeout (${response.status}). The AI model took longer than expected to respond.`;
        } else if (response.status === 500) {
          errorMsg = `Server error (${response.status}). Check server-side logs and AWS/Bedrock configuration.`;
        } else if (rawText && rawText.length < 150 && !rawText.includes('<html')) {
          errorMsg = rawText.trim();
        } else {
          errorMsg = `Server request failed with status ${response.status} (${response.statusText || 'Error'}).`;
        }
      }

      return {
        ok: false,
        status: response.status,
        data: parsedData,
        error: errorMsg,
      };
    }

    // If response was ok but not application/json
    if (parsedData === null && rawText) {
      try {
        parsedData = JSON.parse(rawText);
      } catch {
        return {
          ok: false,
          status: response.status,
          error: `Server returned non-JSON response (${contentType || 'plain text'}). Expected JSON.`,
        };
      }
    }

    return {
      ok: true,
      status: response.status,
      data: parsedData as T,
    };
  } catch (netErr: any) {
    console.error(`[CivicVoice API] Network error calling ${url}:`, netErr);
    return {
      ok: false,
      status: 0,
      error: netErr.message || 'Network request failed. Please verify your internet connection.',
    };
  }
}