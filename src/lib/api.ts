/**
 * Safe API Fetch Utility for CivicVoice AI
 * Prevents "Unexpected token 'T', The page could not be found" JSON parse errors
 * when AWS API Gateway or proxies return HTML error pages or non-JSON responses.
 */

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
