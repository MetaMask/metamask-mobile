import { expectSaga } from 'redux-saga-test-plan';
import { select } from 'redux-saga/effects';
import { CLEAR_ONBOARDING } from '../../actions/onboarding';
import { setDataCollectionForMarketing } from '../../actions/security';
import { clearAttribution } from '../../core/redux/slices/attribution';
import { analytics } from '../../util/analytics/analytics';
import Logger from '../../util/Logger';
import { selectAnalyticsOptedInToMarketing } from '../../selectors/analyticsController';
import { selectAttributionRecord } from '../../selectors/attribution';
import { UPDATE_BG_STATE_KEY } from '../../core/EngineService/constants';
import {
  watchMarketingAttributionOnClearOnboarding,
  watchMarketingAttributionOnConsentChange,
  watchMarketingAttributionOnControllerConsent,
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
    it('opts the controller out when marketing is disabled', async () => {
      await expectSaga(watchMarketingAttributionOnConsentChange)
        .dispatch(setDataCollectionForMarketing(false))
        .call([analytics, analytics.setDataCollectionForMarketing], false)
        .silentRun(50);
    });

    it('opts the controller in when marketing is enabled', async () => {
      await expectSaga(watchMarketingAttributionOnConsentChange)
        .dispatch(setDataCollectionForMarketing(true))
        .call([analytics, analytics.setDataCollectionForMarketing], true)
        .not.put(clearAttribution())
        .silentRun(50);
    });

    it('restores the switch without a controller opt-in when marketing delivery is still on', async () => {
      const error = new Error('controller opt-out failed');
      jest
        .mocked(analytics.setDataCollectionForMarketing)
        .mockRejectedValueOnce(error);

      await expectSaga(watchMarketingAttributionOnConsentChange)
        .provide([[select(selectAnalyticsOptedInToMarketing), true]])
        .dispatch(setDataCollectionForMarketing(false))
        .call([analytics, analytics.setDataCollectionForMarketing], false)
        .put(setDataCollectionForMarketing(true, { skipControllerSync: true }))
        .not.call([analytics, analytics.setDataCollectionForMarketing], true)
        .not.put(clearAttribution())
        .silentRun(50);

      expect(jest.mocked(Logger.error)).toHaveBeenCalledWith(
        error,
        'Failed to copy marketing preference into AnalyticsController',
      );
    });

    it('keeps a failed opt-out from granting consent when the controller is not opted in', async () => {
      jest
        .mocked(analytics.setDataCollectionForMarketing)
        .mockRejectedValueOnce(new Error('controller opt-out failed'));

      await expectSaga(watchMarketingAttributionOnConsentChange)
        .provide([[select(selectAnalyticsOptedInToMarketing), false]])
        .dispatch(setDataCollectionForMarketing(false))
        .call([analytics, analytics.setDataCollectionForMarketing], false)
        .not.put(
          setDataCollectionForMarketing(true, { skipControllerSync: true }),
        )
        .not.call([analytics, analytics.setDataCollectionForMarketing], true)
        .not.put(clearAttribution())
        .silentRun(50);
    });
  });

  describe('watchMarketingAttributionOnControllerConsent', () => {
    const attribution = { utm_source: 'source', capturedAt: 1 };
    const bgStateUpdate = {
      type: UPDATE_BG_STATE_KEY,
      payload: { key: 'AnalyticsController' },
    };

    it('clears attribution when the controller reports marketing off', async () => {
      await expectSaga(watchMarketingAttributionOnControllerConsent)
        .provide([
          [select(selectAnalyticsOptedInToMarketing), false],
          [select(selectAttributionRecord), attribution],
        ])
        .dispatch(bgStateUpdate)
        .put(clearAttribution())
        .silentRun(50);
    });

    it('keeps attribution while marketing is on', async () => {
      await expectSaga(watchMarketingAttributionOnControllerConsent)
        .provide([
          [select(selectAnalyticsOptedInToMarketing), true],
          [select(selectAttributionRecord), attribution],
        ])
        .dispatch(bgStateUpdate)
        .not.put(clearAttribution())
        .silentRun(50);
    });

    it('waits for controller state before clearing anything', async () => {
      await expectSaga(watchMarketingAttributionOnControllerConsent)
        .provide([
          [select(selectAnalyticsOptedInToMarketing), undefined],
          [select(selectAttributionRecord), attribution],
        ])
        .dispatch(bgStateUpdate)
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
