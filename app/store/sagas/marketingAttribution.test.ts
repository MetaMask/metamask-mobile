import { expectSaga } from 'redux-saga-test-plan';
import { CLEAR_ONBOARDING } from '../../actions/onboarding';
import { setDataCollectionForMarketing } from '../../actions/security';
import { clearAttribution } from '../../core/redux/slices/attribution';
import { analytics } from '../../util/analytics/analytics';
import {
  watchMarketingAttributionOnClearOnboarding,
  watchMarketingAttributionOnConsentChange,
} from './marketingAttribution';

jest.mock('../../util/analytics/analytics', () => ({
  analytics: {
    setDataCollectionForMarketing: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('marketingAttribution sagas', () => {
  describe('watchMarketingAttributionOnConsentChange', () => {
    it('opts the controller out and clears attribution when marketing is disabled', async () => {
      await expectSaga(watchMarketingAttributionOnConsentChange)
        .dispatch(setDataCollectionForMarketing(false))
        .call([analytics, analytics.setDataCollectionForMarketing], false)
        .put(clearAttribution())
        .silentRun(50);
    });

    it('opts the controller in and keeps attribution when marketing is enabled', async () => {
      await expectSaga(watchMarketingAttributionOnConsentChange)
        .dispatch(setDataCollectionForMarketing(true))
        .call([analytics, analytics.setDataCollectionForMarketing], true)
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
