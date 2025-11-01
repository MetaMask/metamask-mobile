import { getPredictErrorMessages } from '../constants/errors';

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
  const errorMessages = getPredictErrorMessages();
  const parsedErrorMessage =
    errorMessages[errorMessage as keyof typeof errorMessages] ??
    errorMessages[defaultCode as keyof typeof errorMessages];
  if (parsedErrorMessage) {
    return parsedErrorMessage;
  }
  return errorMessage;
}
