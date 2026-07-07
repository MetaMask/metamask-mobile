import { strings } from '../../../../../locales/i18n';

const CIRCUIT_BREAKER_OPEN_ERROR_KEY = 'CIRCUIT_BREAKER_OPEN';
const CIRCUIT_BREAKER_OPEN_MESSAGE_KEY = 'fiat_on_ramp.circuit_breaker_open';

function getErrorKey(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('errorKey' in error)) {
    return null;
  }

  const errorKey = (error as { errorKey?: unknown }).errorKey;
  return typeof errorKey === 'string' && errorKey.trim() ? errorKey : null;
}

function getRawMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null && 'error' in error) {
    const resourceError = (error as { error?: unknown }).error;
    return typeof resourceError === 'string' ? resourceError : '';
  }

  return '';
}

/**
 * Extracts a user-friendly error message from API errors.
 *
 * HTTP errors from the API often arrive in the format:
 * "Fetching [url] failed with status '400': {"error":{"statusCode":400,"message":"Invalid OTP"}}"
 *
 * This utility extracts the nested human-readable `message` field so the user
 * sees "Invalid OTP" instead of the full technical string.
 * @param error - The caught error (unknown type from catch blocks)
 * @param fallback - A fallback string to use when no message can be extracted
 * @returns A user-facing error message string
 */
export function parseUserFacingError(error: unknown, fallback: string): string {
  if (getErrorKey(error) === CIRCUIT_BREAKER_OPEN_ERROR_KEY) {
    return strings(CIRCUIT_BREAKER_OPEN_MESSAGE_KEY);
  }

  const rawMessage = getRawMessage(error);

  if (!rawMessage) {
    return fallback;
  }

  const jsonMatch = rawMessage.match(/:\s*(\{[\s\S]*\})\s*$/);
  if (jsonMatch?.[1]) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);

      const nestedMessage =
        parsed?.error?.message ?? parsed?.message ?? parsed?.error;

      if (typeof nestedMessage === 'string' && nestedMessage.trim()) {
        return nestedMessage.trim();
      }
    } catch {
      // JSON parse failed — fall through to raw message handling below
    }
  }

  const looksLikeHttpError =
    /^fetching\s+https?:\/\//i.test(rawMessage) ||
    /failed with status '\d+'/i.test(rawMessage);

  if (looksLikeHttpError) {
    return fallback;
  }

  return rawMessage;
}
