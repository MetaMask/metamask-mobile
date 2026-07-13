import { getAccountActivitySubscriptionCount } from '../../websocket/account-activity-mocks.js';
import { resolveE2EWaitTimeoutMs } from '../../framework/Constants.js';

export const LOGIN_SUBSCRIPTION_TIMEOUT_MS = resolveE2EWaitTimeoutMs(120_000);

export function assertSubscriptionCountAtLeast(
  minimum: number,
  message?: string,
): number {
  const count = getAccountActivitySubscriptionCount();
  if (count < minimum) {
    throw new Error(
      message ??
        `Expected at least ${minimum} account activity subscription(s) but found ${count}`,
    );
  }
  return count;
}

export function assertSubscriptionCountIncreased(
  previousCount: number,
  context: string,
): void {
  const count = getAccountActivitySubscriptionCount();
  if (count <= previousCount) {
    throw new Error(
      `Expected subscription count to increase after ${context} but found ${count} (was ${previousCount})`,
    );
  }
}
