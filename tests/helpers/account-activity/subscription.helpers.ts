import { getAccountActivitySubscriptionCount } from '../../websocket/account-activity-mocks.js';
import {
  resolveE2EFixtureBootstrapTimeoutMs,
  resolveE2EWaitTimeoutMs,
} from '../../framework/Constants.js';

export const LOGIN_SUBSCRIPTION_TIMEOUT_MS = resolveE2EWaitTimeoutMs(120_000);

const LOGIN_FLOW_BUDGET_MS = resolveE2EWaitTimeoutMs(120_000);
const RESUBSCRIBE_SETUP_BUDGET_MS = resolveE2EWaitTimeoutMs(60_000);

/**
 * Playwright per-test budget for account-activity websocket specs. Covers
 * restartDevice bootstrap, two logins, two subscription waits, and lock/background
 * steps. android-smoke's 8-minute project default is too low for resubscribe cases.
 */
export const ACCOUNT_ACTIVITY_WS_TEST_TIMEOUT_MS =
  resolveE2EFixtureBootstrapTimeoutMs() +
  2 * LOGIN_SUBSCRIPTION_TIMEOUT_MS +
  2 * LOGIN_FLOW_BUDGET_MS +
  RESUBSCRIBE_SETUP_BUDGET_MS;

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
