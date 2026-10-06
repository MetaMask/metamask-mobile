import { call, put, takeEvery } from 'redux-saga/effects';
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

/**
 * Clear persisted acquisition data when marketing consent is disabled.
 */
export function* watchMarketingAttributionOnConsentChange() {
  yield takeEvery(
    ActionType.SET_DATA_COLLECTION_FOR_MARKETING,
    function* setDataCollectionForMarketingHandler({
      enabled,
    }: SetDataCollectionForMarketing) {
      // Redux remains the preference the UI writes. This saga copies each
      // marketing preference into AnalyticsController consent.
      try {
        yield call(
          [analytics, analytics.setDataCollectionForMarketing],
          enabled,
        );
      } catch (error) {
        // The switch already shows the opt-out. A failed controller write leaves
        // marketing delivery on, so put the switch back and keep acquisition data.
        Logger.error(
          ensureError(error),
          'Failed to copy marketing preference into AnalyticsController',
        );
        if (enabled === false) {
          yield put(setDataCollectionForMarketing(true));
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
