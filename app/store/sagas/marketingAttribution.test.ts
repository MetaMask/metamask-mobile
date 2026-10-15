import { expectSaga } from 'redux-saga-test-plan';
import { select } from 'redux-saga/effects';
import { CLEAR_ONBOARDING } from '../../actions/onboarding';
import { setDataCollectionForMarketing } from '../../actions/security';
import { clearAttribution } from '../../core/redux/slices/attribution';
import { UPDATE_BG_STATE_KEY } from '../../core/EngineService/constants';
import Logger from '../../util/Logger';
import { selectAnalyticsOptedInToMarketing } from '../../selectors/analyticsController';
import { selectAttributionRecord } from '../../selectors/attribution';
import {
  watchMarketingAttributionOnClearOnboarding,
  watchMarketingAttributionOnConsentChange,
  watchMarketingAttributionOnControllerConsent,
} from './marketingAttribution';

const mockMessengerCall = jest.fn();
jest.mock('../../core/Engine', () => ({
  __esModule: true,
  default: {
    get controllerMessenger() {
      return { call: mockMessengerCall };
    },
  },
}));

jest.mock('../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const attribution = { utm_source: 'source', capturedAt: 1 };
const bgStateUpdate = {
  type: UPDATE_BG_STATE_KEY,
  payload: { key: 'AnalyticsController' },
};

describe('marketingAttribution sagas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMessengerCall.mockResolvedValue(undefined);
  });

  describe('watchMarketingAttributionOnConsentChange', () => {
    it.each([true, false])(
      'saves a marketing preference of %s through MarketingConsentController',
      async (enabled) => {
        await expectSaga(watchMarketingAttributionOnConsentChange)
          .dispatch(setDataCollectionForMarketing(enabled))
          .silentRun(50);

        expect(mockMessengerCall).toHaveBeenCalledWith(
          'MarketingConsentController:setMarketingConsent',
          enabled,
        );
      },
    );

    it('logs a failed save', async () => {
      const error = new Error('AUS did not save the change');
      mockMessengerCall.mockRejectedValueOnce(error);

      await expectSaga(watchMarketingAttributionOnConsentChange)
        .dispatch(setDataCollectionForMarketing(false))
        .silentRun(50);

      expect(jest.mocked(Logger.error)).toHaveBeenCalledWith(
        error,
        'Failed to save marketing consent',
      );
    });
  });

  describe('watchMarketingAttributionOnControllerConsent', () => {
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
