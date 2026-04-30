import { expectSaga } from 'redux-saga-test-plan';
import {
  ActionType,
  setDataCollectionForMarketing,
} from '../../actions/security';
import { CLEAR_ONBOARDING } from '../../actions/onboarding';
import { clearAttribution } from '../../core/redux/slices/attribution';
import {
  watchMarketingAttributionOnClearOnboarding,
  watchMarketingAttributionOnConsentChange,
} from './marketingAttribution';

describe('marketingAttribution sagas', () => {
  describe('watchMarketingAttributionOnConsentChange', () => {
    it('dispatches clearAttribution when marketing consent becomes false', async () => {
      await expectSaga(watchMarketingAttributionOnConsentChange)
        .put(clearAttribution())
        .dispatch({
          type: ActionType.SET_DATA_COLLECTION_FOR_MARKETING,
          enabled: false,
        })
        .silentRun();
    });

    it('does not dispatch clearAttribution when marketing consent becomes true', async () => {
      await expectSaga(watchMarketingAttributionOnConsentChange)
        .not.put(clearAttribution())
        .dispatch(setDataCollectionForMarketing(true))
        .silentRun();
    });
  });

  describe('watchMarketingAttributionOnClearOnboarding', () => {
    it('dispatches clearAttribution when onboarding is cleared', async () => {
      await expectSaga(watchMarketingAttributionOnClearOnboarding)
        .put(clearAttribution())
        .dispatch({ type: CLEAR_ONBOARDING })
        .silentRun();
    });
  });
});
