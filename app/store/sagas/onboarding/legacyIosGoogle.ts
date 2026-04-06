import { call, delay, put, select, take } from 'redux-saga/effects';
import NavigationService from '../../../core/NavigationService';
import { presentIosGoogleLoginVersionWarningSheet } from '../../../components/Views/Onboarding/OnboardingIosPrompt';
import Device from '../../../util/device';
import Logger from '../../../util/Logger';
import { UserActionType } from '../../../actions/user';
import { selectOnboardingIosGoogleWarningSheetPrompted } from '../../../selectors/onboarding';
import { setIosGoogleWarningSheetPrompted } from '../../../actions/onboarding';

const promptIosGoogleWarningSheet = async function () {
  const navigation = NavigationService.navigation;
  await presentIosGoogleLoginVersionWarningSheet(navigation);
};

export function* promptIosGoogleWarningSheetSaga() {
  if (Device.isIos() && Device.comparePlatformVersionTo('17.4') > 0) {
    yield take(UserActionType.LOGIN);

    // delay to ensure the navigation to wallet home screen is processed
    yield delay(5000);

    try {
      // check for state
      const iosGoogleWarningSheetPrompted: boolean = yield select(
        selectOnboardingIosGoogleWarningSheetPrompted,
      );
      if (iosGoogleWarningSheetPrompted) {
        return;
      }

      yield call(promptIosGoogleWarningSheet);
      yield put(setIosGoogleWarningSheetPrompted(true));
    } catch (error) {
      Logger.error(error as Error, 'Failed to prompt iOS Google warning sheet');
    }
  }
}
