import { call, delay, put, select, take } from 'redux-saga/effects';
import NavigationService from '../../../core/NavigationService';
import { presentIosGoogleLoginVersionWarningSheet } from '../../../components/Views/Onboarding/OnboardingIosPrompt';
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

/** Minimum time between showing the iOS Google version warning sheet after dismiss. */
export const IOS_GOOGLE_WARNING_SHEET_REMINDER_INTERVAL_MS =
  7 * 24 * 60 * 60 * 1000;

const promptIosGoogleWarningSheet = async function () {
  const navigation = NavigationService.navigation;
  await presentIosGoogleLoginVersionWarningSheet(navigation);
};

export function* promptIosGoogleWarningSheetSaga() {
  if (Device.isIos() && Device.comparePlatformVersionTo('17.4') < 0) {
    yield take(UserActionType.LOGIN);

    // delay to ensure the navigation to wallet home screen is processed
    yield delay(5000);

    try {
      // check if the user is on the seedless Google login flow
      const isSeedlessLoginFlow: boolean = yield select(
        selectSeedlessOnboardingLoginFlow,
      );
      const authConnection: string | undefined = yield select(
        selectSeedlessOnboardingAuthConnection,
      );
      if (!isSeedlessLoginFlow || authConnection !== AuthConnection.Google) {
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
