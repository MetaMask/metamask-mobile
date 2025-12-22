import type { AnalyticsPlatformAdapter } from '@metamask/analytics-controller';

/**
 * E2E noop platform adapter for the AnalyticsController.
 * All methods are empty to prevent network requests during E2E tests.
 */
export const createPlatformAdapter = (): AnalyticsPlatformAdapter => ({
  track() {
    // noop
  },

  identify() {
    // noop
  },

  view() {
    // noop
  },

  onSetupCompleted() {
    // noop
  },
});
