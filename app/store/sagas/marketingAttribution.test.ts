import { expectSaga } from 'redux-saga-test-plan';
import { select } from 'redux-saga/effects';
import { CLEAR_ONBOARDING } from '../../actions/onboarding';
import { setDataCollectionForMarketing } from '../../actions/security';
import { clearAttribution } from '../../core/redux/slices/attribution';
import {
  INIT_BG_STATE_KEY,
  UPDATE_BG_STATE_KEY,
} from '../../core/EngineService/constants';
import Logger from '../../util/Logger';
import { selectMarketingConsent } from '../../selectors/analyticsController';
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
const appStart = { type: INIT_BG_STATE_KEY };
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
    it.each([
      ['undecided on app start', appStart, null],
      ['opted out on app start', appStart, false],
      ['opted out during the session', bgStateUpdate, false],
    ])('clears attribution when %s', async (_, action, consent) => {
      await expectSaga(watchMarketingAttributionOnControllerConsent)
        .provide([
          [select(selectMarketingConsent), consent],
          [select(selectAttributionRecord), attribution],
        ])
        .dispatch(action)
        .put(clearAttribution())
        .silentRun(50);
    });

    it.each([
      ['opted in on app start', appStart, true],
      ['opted in during the session', bgStateUpdate, true],
      ['undecided during the session', bgStateUpdate, null],
    ])('keeps attribution when %s', async (_, action, consent) => {
      await expectSaga(watchMarketingAttributionOnControllerConsent)
        .provide([
          [select(selectMarketingConsent), consent],
          [select(selectAttributionRecord), attribution],
        ])
        .dispatch(action)
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
