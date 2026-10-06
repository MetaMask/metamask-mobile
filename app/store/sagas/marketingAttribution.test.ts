import { expectSaga } from 'redux-saga-test-plan';
import { CLEAR_ONBOARDING } from '../../actions/onboarding';
import { setDataCollectionForMarketing } from '../../actions/security';
import { clearAttribution } from '../../core/redux/slices/attribution';
import { analytics } from '../../util/analytics/analytics';
import Logger from '../../util/Logger';
import {
  watchMarketingAttributionOnClearOnboarding,
  watchMarketingAttributionOnConsentChange,
} from './marketingAttribution';

jest.mock('../../util/analytics/analytics', () => ({
  analytics: {
    setDataCollectionForMarketing: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
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

    it('restores marketing opt-in and keeps attribution when the controller opt-out fails', async () => {
      const error = new Error('controller opt-out failed');
      jest
        .mocked(analytics.setDataCollectionForMarketing)
        .mockRejectedValueOnce(error);

      await expectSaga(watchMarketingAttributionOnConsentChange)
        .dispatch(setDataCollectionForMarketing(false))
        .call([analytics, analytics.setDataCollectionForMarketing], false)
        .put(setDataCollectionForMarketing(true))
        .not.put(clearAttribution())
        .silentRun(50);

      expect(jest.mocked(Logger.error)).toHaveBeenCalledWith(
        error,
        'Failed to copy marketing preference into AnalyticsController',
      );
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
