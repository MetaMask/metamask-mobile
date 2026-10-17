import { call, put, select, takeEvery } from 'redux-saga/effects';
import {
  ActionType,
  setDataCollectionForMarketing,
  type SetDataCollectionForMarketing,
} from '../../actions/security';
import { CLEAR_ONBOARDING } from '../../actions/onboarding';
import {
  clearAttribution,
  type AttributionRecord,
} from '../../core/redux/slices/attribution';
import {
  INIT_BG_STATE_KEY,
  UPDATE_BG_STATE_KEY,
} from '../../core/EngineService/constants';
import { analytics } from '../../util/analytics/analytics';
import { ensureError } from '../../util/errorUtils';
import Logger from '../../util/Logger';
import { selectAnalyticsOptedInToMarketing } from '../../selectors/analyticsController';
import { selectAttributionRecord } from '../../selectors/attribution';

/**
 * Copy each marketing preference the UI writes into AnalyticsController.
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
      }
    },
  );
}

/**
 * Clear persisted acquisition data whenever marketing consent is off,
 * including when it was revoked on another device.
 */
export function* watchMarketingAttributionOnControllerConsent() {
  yield takeEvery(
    [INIT_BG_STATE_KEY, UPDATE_BG_STATE_KEY],
    function* clearAttributionWithoutConsent() {
      const optedIn: boolean | undefined = yield select(
        selectAnalyticsOptedInToMarketing,
      );
      const attribution: AttributionRecord | null = yield select(
        selectAttributionRecord,
      );
      if (optedIn === false && attribution) {
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
