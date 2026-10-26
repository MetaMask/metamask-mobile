/**
 * One WebDriver command on a dead UiAutomator2 session can sit until
 * `connectionRetryTimeout` (150s on the Android emulator). Callers that retry
 * only after the command settles never get a second attempt.
 */
export const DEFAULT_ATTEMPT_TIMEOUT_MS = 15_000;

export class AttemptDeadlineError extends Error {
  readonly attemptTimeoutMs: number;

  constructor(attemptTimeoutMs: number) {
    super(
      `WebDriver command exceeded the ${attemptTimeoutMs}ms attempt deadline`,
    );
    this.name = 'AttemptDeadlineError';
    this.attemptTimeoutMs = attemptTimeoutMs;
  }
}

/**
 * Reject when `operation` has not settled within `timeoutMs`.
 * A late rejection from the original command is ignored so it cannot surface
 * as an unhandled rejection after the deadline already won.
 */
export function withCommandDeadline<T>(
  operation: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      reject(new AttemptDeadlineError(timeoutMs));
    }, timeoutMs);

    operation.then(
      (value) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
