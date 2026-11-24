import { captureException } from '@sentry/react-native';
import { willBusyRefetch } from './useOneShotBusyRefetch';

/** One rejection shared by several screens is still one failure. */
const reportedErrors = new WeakSet<object>();

/**
 * The controller throws this as an ordinary Error when the flag is off.
 * Prefetch and tab routing skip the call. A hook that still calls, including
 * the Money Home hook on a later branch, must not report it.
 */
const REWARDS_MONEY_DISABLED_MESSAGE = 'Rewards Money is disabled';

function isRewardsMoneyDisabled(error: unknown): boolean {
  return (
    error instanceof Error && error.message === REWARDS_MONEY_DISABLED_MESSAGE
  );
}

/**
 * Report a read that the screen will not recover by itself. `feature` is the
 * caller's Sentry tag.
 *
 * A failure {@link willBusyRefetch} accepts still has one refetch ahead of
 * it, so the first failure stays quiet. The refetch's failure is the one that
 * stuck. A disabled controller is not a failure of the read, so it stays
 * quiet too. Any other failure is reported now. A second screen waiting on
 * the same rejected promise does not report it again.
 */
export function reportRewardsMoneyReadFailure(
  error: unknown,
  context: string,
  followUp: boolean,
  feature: string,
): void {
  if (isRewardsMoneyDisabled(error)) {
    return;
  }
  if (!followUp && willBusyRefetch(error)) {
    return;
  }
  if (typeof error === 'object' && error !== null) {
    if (reportedErrors.has(error)) {
      return;
    }
    reportedErrors.add(error);
  }
  captureException(error instanceof Error ? error : new Error(String(error)), {
    tags: { feature, context },
  });
}
