import type { AnyAction } from 'redux';
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
import { selectMarketingConsent } from '../../selectors/analyticsController';
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
 * Clear persisted acquisition data on app start unless marketing consent was
 * granted, and later whenever consent is turned off, including when it was
 * revoked on another device. Undecided users keep it for the rest of the
 * session, so onboarding can attach it once they opt in.
 */
export function* watchMarketingAttributionOnControllerConsent() {
  yield takeEvery(
    [INIT_BG_STATE_KEY, UPDATE_BG_STATE_KEY],
    function* clearAttributionWithoutConsent({ type }: AnyAction) {
      const consent: boolean | null = yield select(selectMarketingConsent);
      const attribution: AttributionRecord | null = yield select(
        selectAttributionRecord,
      );
      // INIT_BG_STATE stands in for app start: it is dispatched before
      // deeplink intake starts (startAppServices), so it never clears
      // attribution saved during this session.
      const keep =
        type === INIT_BG_STATE_KEY ? consent === true : consent !== false;
      if (attribution && !keep) {
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
