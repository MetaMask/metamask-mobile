import { call, put, select, takeEvery } from 'redux-saga/effects';
import {
  ActionType,
  setDataCollectionForMarketing,
  type SetDataCollectionForMarketing,
} from '../../actions/security';
import { CLEAR_ONBOARDING } from '../../actions/onboarding';
import { clearAttribution } from '../../core/redux/slices/attribution';
import { analytics } from '../../util/analytics/analytics';
import { ensureError } from '../../util/errorUtils';
import Logger from '../../util/Logger';
import { selectAnalyticsOptedInToMarketing } from '../../selectors/analyticsController';

/**
 * Clear persisted acquisition data when marketing consent is disabled.
 */
export function* watchMarketingAttributionOnConsentChange() {
  yield takeEvery(
    ActionType.SET_DATA_COLLECTION_FOR_MARKETING,
    function* setDataCollectionForMarketingHandler({
      enabled,
      skipControllerSync,
    }: SetDataCollectionForMarketing) {
      if (skipControllerSync) {
        return;
      }
      // Redux remains the preference the UI writes. This saga copies each
      // marketing preference into AnalyticsController consent.
      try {
        yield call(
          [analytics, analytics.setDataCollectionForMarketing],
          enabled,
        );
      } catch (error) {
        Logger.error(
          ensureError(error),
          'Failed to copy marketing preference into AnalyticsController',
        );
        if (enabled === false) {
          const controllerOptedIn: boolean | undefined = yield select(
            selectAnalyticsOptedInToMarketing,
          );
          // The failed opt-out did not change the controller. Restore the switch
          // only when marketing delivery is still on, and do not record a new opt-in.
          if (controllerOptedIn === true) {
            yield put(
              setDataCollectionForMarketing(true, { skipControllerSync: true }),
            );
          }
        }
        return;
      }
      if (enabled === false) {
        yield put(clearAttribution());
      }
    },
  );
}

/**
 * Clear attribution when the onboarding slice is reset (e.g. wallet delete).
 */
export function* watchMarketingAttributionOnClearOnboarding() {
  yield takeEvery(
    CLEAR_ONBOARDING,
    function* clearOnboardingMarketingHandler() {
      yield put(clearAttribution());
    },
  );
}
