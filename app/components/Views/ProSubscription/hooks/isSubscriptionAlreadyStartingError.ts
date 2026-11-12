export const SUBSCRIPTION_ALREADY_STARTING_MESSAGE =
  'Money Account subscription is already starting';

/**
 * True when a second subscription start was rejected because the first
 * checkout is still in flight.
 *
 * @param error - Rejection from `startSubscription`.
 * @returns Whether the error is the in-progress guard, not a failed checkout.
 */
export function isSubscriptionAlreadyStartingError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message === SUBSCRIPTION_ALREADY_STARTING_MESSAGE
  );
}
