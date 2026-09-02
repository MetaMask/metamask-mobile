import { MetaMetricsEvents } from '../../core/Analytics/MetaMetrics.events';
import { UnlockWalletErrorType } from '../../core/Authentication/types';
import { analytics } from './analytics';
import { AnalyticsEventBuilder } from './AnalyticsEventBuilder';
import Logger from '../Logger';

/**
 * Tracks unlockWallet failure on App Unlocked Failed. Mixpanel wipe slice is
 * forced_reset true (lockApp was called with reset after the failure).
 *
 * @param unlockErrorType - The classified reason unlockWallet failed.
 * @param forcedReset - Whether lockApp was called with reset:true as a result.
 */
export const trackForcedReset = (
  unlockErrorType: UnlockWalletErrorType,
  forcedReset: boolean,
): void => {
  try {
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.APP_UNLOCKED_FAILED,
      )
        .addProperties({
          unlock_error_type: unlockErrorType,
          forced_reset: forcedReset,
        })
        .build(),
    );
  } catch (error) {
    // Never throw from analytics tracking - log and continue
    Logger.error(
      error as Error,
      'Error tracking App Unlocked Failed - analytics tracking failed',
    );
  }
};
