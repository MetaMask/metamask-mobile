import { renderHook, act } from '@testing-library/react-native';
import { useDispatch } from 'react-redux';
import { MetaMetricsEvents } from '../../../../../../../core/Analytics';
import {
  SocialLeaderboardEventProperties,
  SocialLeaderboardEventValues,
} from '../../../../analytics';
import { useQuickBuyAnalytics } from './useQuickBuyAnalytics';

const mockDispatch = jest.fn();
const mockTrack = jest.fn();
const mockResetBridgeState = jest.fn(() => ({ type: 'bridge/reset' }));
const mockBridgeControllerResetState = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
}));

jest.mock('../../../../analytics', () => ({
  SocialLeaderboardEventProperties: {
    TRADER_ADDRESS: 'trader_address',
    CAIP19: 'caip19',
    DISMISS_STAGE: 'dismiss_stage',
    AMOUNT_USD: 'amount_usd',
    AMOUNT_SELECTION_METHOD: 'amount_selection_method',
    PAY_WITH_TOKEN: 'pay_with_token',
  },
  SocialLeaderboardEventValues: {
    DISMISS_STAGE: {
      TOKEN_DETAIL: 'token_detail',
      AMOUNT_SELECTION: 'amount_selection',
      CONFIRMATION: 'confirmation',
    },
    AMOUNT_SELECTION_METHOD: {
      CUSTOM_INPUT: 'custom_input',
      SLIDER: 'slider',
    },
  },
  useSocialLeaderboardAnalytics: () => ({ track: mockTrack }),
}));

jest.mock('../../../../../../../core/Analytics', () => ({
  MetaMetricsEvents: {
    SOCIAL_QUICK_BUY_DISMISSED: 'SOCIAL_QUICK_BUY_DISMISSED',
    SOCIAL_QUICK_BUY_AMOUNT_SELECTED: 'SOCIAL_QUICK_BUY_AMOUNT_SELECTED',
    SOCIAL_QUICK_BUY_TRADE_SUBMITTED: 'SOCIAL_QUICK_BUY_TRADE_SUBMITTED',
    SOCIAL_QUICK_BUY_TRADE_COMPLETED: 'SOCIAL_QUICK_BUY_TRADE_COMPLETED',
  },
}));

jest.mock('../../../../../../../core/redux/slices/bridge', () => ({
  resetBridgeState: () => mockResetBridgeState(),
}));

jest.mock('../../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      BridgeController: {
        resetState: () => mockBridgeControllerResetState(),
      },
    },
  },
}));

const TRADER = '0xTrader';
const CAIP19 = 'eip155:1/erc20:0xtoken';

describe('useQuickBuyAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
  });

  describe('trackAmountSelected', () => {
    it('fires AMOUNT_SELECTED with correct properties', () => {
      const { result } = renderHook(() => useQuickBuyAnalytics(TRADER, CAIP19));

      act(() => {
        result.current.trackAmountSelected(
          25,
          SocialLeaderboardEventValues.AMOUNT_SELECTION_METHOD.CUSTOM_INPUT,
          'ETH',
        );
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_QUICK_BUY_AMOUNT_SELECTED,
        expect.objectContaining({
          [SocialLeaderboardEventProperties.TRADER_ADDRESS]: TRADER,
          [SocialLeaderboardEventProperties.CAIP19]: CAIP19,
          [SocialLeaderboardEventProperties.AMOUNT_USD]: 25,
          [SocialLeaderboardEventProperties.AMOUNT_SELECTION_METHOD]:
            SocialLeaderboardEventValues.AMOUNT_SELECTION_METHOD.CUSTOM_INPUT,
          [SocialLeaderboardEventProperties.PAY_WITH_TOKEN]: 'ETH',
        }),
      );
    });

    it('includes slider_percent when provided', () => {
      const { result } = renderHook(() => useQuickBuyAnalytics(TRADER, CAIP19));

      act(() => {
        result.current.trackAmountSelected(
          50,
          SocialLeaderboardEventValues.AMOUNT_SELECTION_METHOD.SLIDER,
          undefined,
          25,
        );
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_QUICK_BUY_AMOUNT_SELECTED,
        expect.objectContaining({ slider_percent: 25 }),
      );
    });

    it('does not include slider_percent when not provided', () => {
      const { result } = renderHook(() => useQuickBuyAnalytics(TRADER, CAIP19));

      act(() => {
        result.current.trackAmountSelected(
          50,
          SocialLeaderboardEventValues.AMOUNT_SELECTION_METHOD.CUSTOM_INPUT,
        );
      });

      const call = mockTrack.mock.calls[0][1];
      expect(call).not.toHaveProperty('slider_percent');
    });

    it('is a no-op when traderAddress is empty', () => {
      const { result } = renderHook(() => useQuickBuyAnalytics('', CAIP19));

      act(() => {
        result.current.trackAmountSelected(
          25,
          SocialLeaderboardEventValues.AMOUNT_SELECTION_METHOD.CUSTOM_INPUT,
        );
      });

      expect(mockTrack).not.toHaveBeenCalled();
    });

    it('is a no-op when caip19 is empty', () => {
      const { result } = renderHook(() => useQuickBuyAnalytics(TRADER, ''));

      act(() => {
        result.current.trackAmountSelected(
          25,
          SocialLeaderboardEventValues.AMOUNT_SELECTION_METHOD.CUSTOM_INPUT,
        );
      });

      expect(mockTrack).not.toHaveBeenCalled();
    });

    it('prefers analyticsContext.traderAddress over the hook arg', () => {
      const { result } = renderHook(() =>
        useQuickBuyAnalytics(TRADER, CAIP19, { traderAddress: '0xOverride' }),
      );

      act(() => {
        result.current.trackAmountSelected(
          10,
          SocialLeaderboardEventValues.AMOUNT_SELECTION_METHOD.CUSTOM_INPUT,
        );
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_QUICK_BUY_AMOUNT_SELECTED,
        expect.objectContaining({
          [SocialLeaderboardEventProperties.TRADER_ADDRESS]: '0xOverride',
        }),
      );
    });
  });

  describe('trackTradeSubmitted / trackTradeCompleted', () => {
    it('fires TRADE_SUBMITTED with provided props', () => {
      const { result } = renderHook(() => useQuickBuyAnalytics(TRADER, CAIP19));

      act(() => {
        result.current.trackTradeSubmitted({ foo: 'bar' });
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_QUICK_BUY_TRADE_SUBMITTED,
        { foo: 'bar' },
      );
    });

    it('fires TRADE_COMPLETED with provided props', () => {
      const { result } = renderHook(() => useQuickBuyAnalytics(TRADER, CAIP19));

      act(() => {
        result.current.trackTradeCompleted({ tx: '0xhash' });
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_QUICK_BUY_TRADE_COMPLETED,
        { tx: '0xhash' },
      );
    });
  });

  describe('markTradeSubmitted', () => {
    it('updates dismissStageRef to CONFIRMATION and sets tradeSubmittedRef', () => {
      const { result } = renderHook(() => useQuickBuyAnalytics(TRADER, CAIP19));

      act(() => {
        result.current.markTradeSubmitted();
      });

      expect(result.current.refs.tradeSubmittedRef.current).toBe(true);
      expect(result.current.refs.dismissStageRef.current).toBe(
        SocialLeaderboardEventValues.DISMISS_STAGE.CONFIRMATION,
      );
    });
  });

  describe('unmount — DISMISSED event', () => {
    it('fires DISMISSED on unmount when trade was not submitted', () => {
      const { unmount } = renderHook(() =>
        useQuickBuyAnalytics(TRADER, CAIP19),
      );

      unmount();

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_QUICK_BUY_DISMISSED,
        expect.objectContaining({
          [SocialLeaderboardEventProperties.TRADER_ADDRESS]: TRADER,
          [SocialLeaderboardEventProperties.CAIP19]: CAIP19,
          [SocialLeaderboardEventProperties.DISMISS_STAGE]:
            SocialLeaderboardEventValues.DISMISS_STAGE.TOKEN_DETAIL,
        }),
      );
    });

    it('includes amount_usd in DISMISSED event when an amount was selected', () => {
      const { result, unmount } = renderHook(() =>
        useQuickBuyAnalytics(TRADER, CAIP19),
      );

      act(() => {
        result.current.trackAmountSelected(
          42,
          SocialLeaderboardEventValues.AMOUNT_SELECTION_METHOD.CUSTOM_INPUT,
        );
      });

      mockTrack.mockClear();
      unmount();

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_QUICK_BUY_DISMISSED,
        expect.objectContaining({
          [SocialLeaderboardEventProperties.AMOUNT_USD]: 42,
        }),
      );
    });

    it('does NOT fire DISMISSED when trade was submitted', () => {
      const { result, unmount } = renderHook(() =>
        useQuickBuyAnalytics(TRADER, CAIP19),
      );

      act(() => {
        result.current.markTradeSubmitted();
      });

      mockTrack.mockClear();
      unmount();

      expect(mockTrack).not.toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_QUICK_BUY_DISMISSED,
        expect.anything(),
      );
    });

    it('dispatches resetBridgeState on unmount', () => {
      const { unmount } = renderHook(() =>
        useQuickBuyAnalytics(TRADER, CAIP19),
      );

      unmount();

      expect(mockDispatch).toHaveBeenCalled();
      expect(mockResetBridgeState).toHaveBeenCalled();
    });

    it('calls BridgeController.resetState on unmount', () => {
      const { unmount } = renderHook(() =>
        useQuickBuyAnalytics(TRADER, CAIP19),
      );

      unmount();

      expect(mockBridgeControllerResetState).toHaveBeenCalled();
    });
  });
});
