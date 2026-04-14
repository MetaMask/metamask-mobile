import { call, delay, put, select, take } from 'redux-saga/effects';
import NavigationService from '../../../core/NavigationService';
import { presentIosGoogleLoginVersionWarningSheetReminder } from '../../../components/Views/Onboarding/OnboardingIosPrompt';
import Device from '../../../util/device';
import Logger from '../../../util/Logger';
import { UserActionType } from '../../../actions/user';
import { selectOnboardingIosGoogleWarningSheetLastDismissedAt } from '../../../selectors/onboarding';
import { setIosGoogleWarningSheetLastDismissedAt } from '../../../actions/onboarding';
import { AuthConnection } from '../../../core/OAuthService/OAuthInterface';
import {
  selectSeedlessOnboardingAuthConnection,
  selectSeedlessOnboardingLoginFlow,
} from '../../../selectors/seedlessOnboardingController';
import { selectGoogleLoginIosUnsupportedBlockingEnabled } from '../../../selectors/featureFlagController/googleLoginIosUnsupportedBlocking';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
import { analytics } from '../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';

/**
 * Cooldown between reminder presentations of the iOS Google version warning sheet after the user
 * dismisses it (milliseconds).
 */
export const IOS_GOOGLE_WARNING_SHEET_REMINDER_INTERVAL_MS =
  7 * 24 * 60 * 60 * 1000;

/**
 * Presents the iOS Google login version reminder sheet using the current root navigation.
 */
const promptIosGoogleWarningSheet = async function () {
  const navigation = NavigationService.navigation;
  await presentIosGoogleLoginVersionWarningSheetReminder(navigation);

  if (analytics.isEnabled()) {
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.WALLET_GOOGLE_IOS_WARNING_VIEWED,
      )
        .addProperties({ location: 'ios_google_warning_saga' })
        .build(),
    );
  }
};

/**
 * After login on iOS versions below 17.4 with google login, may show a reminder that Google login requires a newer iOS.
 *
 * Runs only when blocking mode is off, the user completed seedless onboarding with Google, and the
 * reminder was not dismissed within {@link IOS_GOOGLE_WARNING_SHEET_REMINDER_INTERVAL_MS}.
 * Waits for {@link UserActionType.LOGIN} and a short delay so navigation to the wallet home can finish.
 */
export function* promptIosGoogleWarningSheetSaga() {
  if (Device.isIos() && Device.comparePlatformVersionTo('17.4') < 0) {
    yield take(UserActionType.LOGIN);

    // delay to ensure the navigation to wallet home screen is processed
    yield delay(5000);

    try {
      const googleLoginIosUnsupportedBlockingEnabled: boolean = yield select(
        selectGoogleLoginIosUnsupportedBlockingEnabled,
      );
      // check if the user is on the seedless Google login flow
      const isSeedlessLoginFlow: boolean = yield select(
        selectSeedlessOnboardingLoginFlow,
      );
      const authConnection: string | undefined = yield select(
        selectSeedlessOnboardingAuthConnection,
      );

      if (
        googleLoginIosUnsupportedBlockingEnabled ||
        !isSeedlessLoginFlow ||
        authConnection !== AuthConnection.Google
      ) {
        return;
      }

      // check if the user has already dismissed the warning sheet in the last 7 days
      const lastDismissedAt: number | null = yield select(
        selectOnboardingIosGoogleWarningSheetLastDismissedAt,
      );
      if (
        lastDismissedAt !== null &&
        Date.now() - lastDismissedAt <
          IOS_GOOGLE_WARNING_SHEET_REMINDER_INTERVAL_MS
      ) {
        return;
      }

      yield call(promptIosGoogleWarningSheet);
      const dismissedAt = Date.now();
      yield put(setIosGoogleWarningSheetLastDismissedAt(dismissedAt));
    } catch (error) {
      Logger.error(error as Error, 'Failed to prompt iOS Google warning sheet');
    }
  }
}
