/**
 * Robust Client API Request Layer for Terra-Gotchi
 * - Checks response.ok before treating a response as successful
 * - Inspects Content-Type headers
 * - Handles non-JSON / HTML / plain-text server errors gracefully without JSON.parse crashing
 * - Distinguishes network errors, serverless 500s, Gemini API errors, and timeouts
 */

export interface ApiRequestOptions extends RequestInit {
  timeoutMs?: number;
}

export class AppApiError extends Error {
  status: number;
  code: string;
  details?: any;

  constructor(message: string, status: number = 500, code: string = 'API_ERROR', details?: any) {
    super(message);
    this.name = 'AppApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function safeFetchJson<T = any>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { timeoutMs = 25000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new AppApiError(
        'The request timed out while contacting the server. Please check your internet connection.',
        504,
        'NETWORK_TIMEOUT'
      );
    }
    throw new AppApiError(
      `Network connection failed: ${err.message || 'Unable to reach server. Please check your connection.'}`,
      0,
      'NETWORK_OFFLINE'
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  let rawText = '';
  try {
    rawText = await response.text();
  } catch (readErr: any) {
    throw new AppApiError(
      `Failed to read server response: ${readErr.message || 'Stream error'}`,
      response.status,
      'RESPONSE_READ_ERROR'
    );
  }

  // Safe JSON extraction: never crash on "Unexpected token 'A', "A server e"..."
  let parsedJson: any = null;
  if (rawText.trim().length > 0) {
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      // Raw text was not JSON (e.g. Vercel plain text "A server error has occurred" or HTML error page)
    }
  }

  if (!response.ok) {
    // Extract structured error code and message if available
    let errorCode = parsedJson?.error?.code || parsedJson?.code || `HTTP_${response.status}`;
    let errorMessage = parsedJson?.error?.message || parsedJson?.error || parsedJson?.message;

    if (!errorMessage) {
      if (response.status === 500) {
        if (rawText.toLowerCase().includes('a server error has occurred')) {
          errorCode = 'VERCEL_SERVER_ERROR';
          errorMessage =
            'A server error occurred on the deployed serverless function. Please verify that GEMINI_API_KEY is configured in your Vercel Project Settings > Environment Variables.';
        } else {
          errorMessage = 'An internal server error occurred while processing your request.';
        }
      } else if (response.status === 503) {
        errorCode = 'SERVICE_UNAVAILABLE';
        errorMessage = 'Gemini AI service is currently unavailable or unconfigured.';
      } else if (response.status === 504) {
        errorCode = 'GATEWAY_TIMEOUT';
        errorMessage = 'The AI vision analysis timed out. Please try snapping another photo.';
      } else if (response.status === 413) {
        errorCode = 'PAYLOAD_TOO_LARGE';
        errorMessage = 'The photo payload is too large. Image compression will adjust it automatically.';
      } else if (response.status === 401) {
        errorCode = 'UNAUTHORIZED';
        errorMessage = 'Please sign in to save your nature progress.';
      } else if (response.status === 404) {
        errorCode = 'NOT_FOUND';
        errorMessage = 'The requested resource or craving was not found.';
      } else {
        errorMessage = rawText.length < 160 && rawText.trim() ? rawText.trim() : `Server returned HTTP ${response.status}`;
      }
    }

    throw new AppApiError(errorMessage, response.status, errorCode, parsedJson);
  }

  if (parsedJson !== null) {
    return parsedJson as T;
  }

  if (isJson && rawText.trim().length === 0) {
    return {} as T;
  }

  throw new AppApiError(
    'Server returned an unrecognized non-JSON response format.',
    response.status,
    'INVALID_RESPONSE_FORMAT',
    rawText.substring(0, 200)
  );
}
