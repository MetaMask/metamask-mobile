/**
 * Reads `message` from a value passed to Sentry's `captureException`.
 *
 * The SDK types that argument as `unknown`, and Jest does not narrow
 * `mock.calls` from `expect.any(Error)`.
 *
 * @param exception - The first argument captured by the Sentry mock.
 * @returns The error message.
 */
export function getErrorMessage(exception: unknown): string {
  if (!(exception instanceof Error)) {
    throw new Error('Expected captureException to receive an Error');
  }

  return exception.message;
}
