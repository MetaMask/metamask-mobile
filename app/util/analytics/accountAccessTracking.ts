import { MetaMetricsEvents } from '../../core/Analytics/MetaMetrics.events';
import { UnlockWalletErrorType } from '../../core/Authentication/types';
import { analytics } from './analytics';
import { AnalyticsEventBuilder } from './AnalyticsEventBuilder';
import Logger from '../Logger';

/**
 * Tracks when unlockWallet forces a keychain/biometric reset (e.g. the OS
 * reports the stored credential is no longer usable), so we can see how
 * often users hit this without their vault actually being touched.
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
        MetaMetricsEvents.ACCOUNT_ACCESS_FORCED_RESET,
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
      'Error tracking account access forced reset event - analytics tracking failed',
    );
  }
};

/**
 * Tracks whether a valid vault backup was found when the user tapped
 * "Forgot password?", i.e. whether they were routed to RestoreWallet
 * instead of straight to the destructive DeleteWalletModal. "Forgot
 * password?" taps themselves are already tracked via
 * MetaMetricsEvents.FORGOT_PASSWORD_CLICKED.
 *
 * @param backupOffered - Whether a valid vault backup was found and the
 * user was routed to RestoreWallet instead of straight to DeleteWalletModal.
 */
export const trackForgotPasswordBackupOffered = (
  backupOffered: boolean,
): void => {
  try {
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.ACCOUNT_ACCESS_FORGOT_PASSWORD_BACKUP_OFFERED,
      )
        .addProperties({
          backup_offered: backupOffered,
        })
        .build(),
    );
  } catch (error) {
    // Never throw from analytics tracking - log and continue
    Logger.error(
      error as Error,
      'Error tracking forgot password backup offered event - analytics tracking failed',
    );
  }
};
