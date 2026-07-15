/**
 * Kalshi 4xx/5xx envelopes (see ISV spec §3.1):
 *
 * Standard nested:
 *   { "error": { "code": "<short_id>", "message": "<human>", "service": "<origin>" } }
 *
 * Three ISV-specific flat shapes:
 *   { "error": "account_exists" }            // 409 on POST /users/create (email match)
 *   { "error": "invalid_phone_number" }      // 400 on profile / phone-otp
 *
 * We normalize all of them into a single shape the routes can branch on.
 */

export interface KalshiNormalizedError {
  status: number;
  code: string;
  message: string;
  service?: string;
  raw: unknown;
}

export function isAccountExistsFlat(error: KalshiNormalizedError): boolean {
  return error.code === 'account_exists' && error.service === undefined;
}

export function normalizeError(
  status: number,
  body: unknown,
): KalshiNormalizedError {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const err = (body as { error: unknown }).error;
    if (typeof err === 'string') {
      // Flat shape.
      return { status, code: err, message: err, raw: body };
    }
    if (typeof err === 'object' && err !== null) {
      const e = err as { code?: string; message?: string; service?: string };
      return {
        status,
        code: e.code ?? 'unknown_error',
        message: e.message ?? e.code ?? 'unknown_error',
        service: e.service,
        raw: body,
      };
    }
  }
  return {
    status,
    code: 'unknown_error',
    message: typeof body === 'string' ? body : 'unknown_error',
    raw: body,
  };
}

/**
 * Canonical PredictError-style envelope the mobile remote adapter consumes.
 * Aligned with PredictErrorCode values in PredictNext/types/errors.ts.
 */
export interface PredictApiError {
  error: {
    code: string;
    message: string;
    venueDetails?: KalshiNormalizedError;
  };
}

export function toPredictError(
  code: string,
  message: string,
  venueDetails?: KalshiNormalizedError,
): PredictApiError {
  return { error: { code, message, venueDetails } };
}
