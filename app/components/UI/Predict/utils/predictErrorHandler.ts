import { PREDICT_ERROR_MESSAGES } from '../constants/errors';

/**
 * Ensures we have a proper Error object for logging
 * Converts unknown/string errors to proper Error instances
 * @param error - The caught error (could be Error, string, or unknown)
 * @returns A proper Error instance
 */
export function ensureError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}

export function parseErrorMessage({
  error,
  defaultCode,
}: {
  error: unknown;
  defaultCode?: string;
}): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const parsedErrorMessage =
    PREDICT_ERROR_MESSAGES[
      errorMessage as keyof typeof PREDICT_ERROR_MESSAGES
    ] ??
    PREDICT_ERROR_MESSAGES[defaultCode as keyof typeof PREDICT_ERROR_MESSAGES];
  if (parsedErrorMessage) {
    return parsedErrorMessage;
  }
  return errorMessage;
}
