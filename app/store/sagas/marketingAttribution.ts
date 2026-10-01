import { call, put, takeEvery } from 'redux-saga/effects';
import {
  ActionType,
  type SetDataCollectionForMarketing,
} from '../../actions/security';
import { CLEAR_ONBOARDING } from '../../actions/onboarding';
import { clearAttribution } from '../../core/redux/slices/attribution';
import { analytics } from '../../util/analytics/analytics';

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
      yield call([analytics, analytics.setDataCollectionForMarketing], enabled);
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
