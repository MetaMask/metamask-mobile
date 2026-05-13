import { expectSaga } from 'redux-saga-test-plan';
import { CLEAR_ONBOARDING } from '../../actions/onboarding';
import { setDataCollectionForMarketing } from '../../actions/security';
import { clearAttribution } from '../../core/redux/slices/attribution';
import {
  watchMarketingAttributionOnClearOnboarding,
  watchMarketingAttributionOnConsentChange,
} from './marketingAttribution';

describe('marketingAttribution sagas', () => {
  describe('watchMarketingAttributionOnConsentChange', () => {
    it('puts clearAttribution when marketing data collection is disabled', async () => {
      await expectSaga(watchMarketingAttributionOnConsentChange)
        .dispatch(setDataCollectionForMarketing(false))
        .put(clearAttribution())
        .silentRun(50);
    });

    it('does not put clearAttribution when marketing data collection is enabled', async () => {
      await expectSaga(watchMarketingAttributionOnConsentChange)
        .dispatch(setDataCollectionForMarketing(true))
        .not.put(clearAttribution())
        .silentRun(50);
    });
  });

  describe('watchMarketingAttributionOnClearOnboarding', () => {
    it('puts clearAttribution when onboarding is cleared', async () => {
      await expectSaga(watchMarketingAttributionOnClearOnboarding)
        .dispatch({ type: CLEAR_ONBOARDING })
        .put(clearAttribution())
        .silentRun(50);
    });
  });
});
