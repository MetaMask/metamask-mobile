import { call, put, select, takeEvery } from 'redux-saga/effects';
import {
  ActionType,
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
import Engine from '../../core/Engine';
import { ensureError } from '../../util/errorUtils';
import Logger from '../../util/Logger';
import { selectAnalyticsOptedInToMarketing } from '../../selectors/analyticsController';
import { selectAttributionRecord } from '../../selectors/attribution';

const saveMarketingConsent = (enabled: boolean) =>
  Engine.controllerMessenger.call(
    'MarketingConsentController:setMarketingConsent',
    enabled,
  );

/**
 * Save each marketing preference the UI writes through
 * MarketingConsentController, which applies it locally and syncs it to
 * Authenticated User Storage.
 */
export function* watchMarketingAttributionOnConsentChange() {
  yield takeEvery(
    ActionType.SET_DATA_COLLECTION_FOR_MARKETING,
    function* setDataCollectionForMarketingHandler({
      enabled,
    }: SetDataCollectionForMarketing) {
      try {
        yield call(saveMarketingConsent, enabled);
      } catch (error) {
        // The controller already re-applied the consent AUS holds.
        Logger.error(ensureError(error), 'Failed to save marketing consent');
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
