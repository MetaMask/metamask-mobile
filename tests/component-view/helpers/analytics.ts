/**
 * Shared analytics helpers for component view tests.
 * Add only what view tests need; keep spies structural so typed and untyped
 * jest spies both fit.
 */

/** Message OAuthService throws when the auth-server marketing sync fails. */
export const MARKETING_SYNC_ERROR = 'Failed to update marketing opt-in status';

interface TrackedEventSpy {
  mock: { calls: unknown[][] };
}

/** First tracked event whose `name` matches, or undefined. */
export function findTrackedEvent(
  trackEventSpy: TrackedEventSpy,
  eventName: string,
): Record<string, unknown> | undefined {
  return trackEventSpy.mock.calls
    .map((call) => call[0])
    .find(
      (event) =>
        typeof event === 'object' &&
        event !== null &&
        'name' in event &&
        (event as Record<string, unknown>).name === eventName,
    ) as Record<string, unknown> | undefined;
}

/** True when a Logger.error call is the auth-server marketing sync failure. */
export function isMarketingSyncError(call: unknown[]): boolean {
  const [error] = call;
  return error instanceof Error && error.message.includes(MARKETING_SYNC_ERROR);
}
