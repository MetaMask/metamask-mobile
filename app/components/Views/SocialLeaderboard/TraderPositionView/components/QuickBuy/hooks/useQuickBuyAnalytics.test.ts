import { renderHook, act } from '@testing-library/react-native';
import { useDispatch } from 'react-redux';
import { MetaMetricsEvents } from '../../../../../../../core/Analytics';
import { QuickBuyEventProperties, QuickBuyEventValues } from '../analytics';
import { useQuickBuyAnalytics } from './useQuickBuyAnalytics';

const mockDispatch = jest.fn();
const mockTrack = jest.fn();
const mockResetBridgeState = jest.fn(() => ({ type: 'bridge/reset' }));
const mockBridgeControllerResetState = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
}));

jest.mock('../analytics', () => ({
  QuickBuyEventProperties: {
    TRADER_ADDRESS: 'trader_address',
    CAIP19: 'caip19',
    DISMISS_STAGE: 'dismiss_stage',
    AMOUNT_USD: 'amount_usd',
    AMOUNT_SELECTION_METHOD: 'amount_selection_method',
    PAY_WITH_TOKEN: 'pay_with_token',
    PRESET_VALUE: 'preset_value',
    SLIDER_PERCENT: 'slider_percent',
    RECEIVE_TOKEN: 'receive_token',
    INTERACTION_TYPE: 'interaction_type',
    QUOTE_INDEX: 'quote_index',
    QUOTE_COUNT: 'quote_count',
    PREVIOUS_PAY_WITH_TOKEN: 'previous_pay_with_token',
    PREVIOUS_RECEIVE_TOKEN: 'previous_receive_token',
    SLIPPAGE: 'slippage',
    PREVIOUS_SLIPPAGE: 'previous_slippage',
  },
  QuickBuyEventValues: {
    DISMISS_STAGE: {
      TOKEN_DETAIL: 'token_detail',
      AMOUNT_SELECTION: 'amount_selection',
      CONFIRMATION: 'confirmation',
    },
    AMOUNT_SELECTION_METHOD: {
      CUSTOM_INPUT: 'custom_input',
      SLIDER: 'slider',
      PRESET: 'preset',
    },
    INTERACTION_TYPE: {
      QUOTE_SELECTED: 'quote_selected',
      PAY_WITH_SELECTED: 'pay_with_selected',
      RECEIVE_TOKEN_SELECTED: 'receive_token_selected',
      SLIPPAGE_CHANGED: 'slippage_changed',
    },
  },
}));

jest.mock('../../../../analytics', () => ({
  useSocialLeaderboardAnalytics: () => ({ track: mockTrack }),
}));

jest.mock('../../../../../../../core/Analytics', () => ({
  MetaMetricsEvents: {
    SOCIAL_QUICK_BUY_DISMISSED: 'SOCIAL_QUICK_BUY_DISMISSED',
    SOCIAL_QUICK_BUY_AMOUNT_SELECTED: 'SOCIAL_QUICK_BUY_AMOUNT_SELECTED',
    SOCIAL_QUICK_BUY_INTERACTED: 'SOCIAL_QUICK_BUY_INTERACTED',
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
          QuickBuyEventValues.AMOUNT_SELECTION_METHOD.CUSTOM_INPUT,
          'ETH',
        );
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_QUICK_BUY_AMOUNT_SELECTED,
        expect.objectContaining({
          [QuickBuyEventProperties.TRADER_ADDRESS]: TRADER,
          [QuickBuyEventProperties.CAIP19]: CAIP19,
          [QuickBuyEventProperties.AMOUNT_USD]: 25,
          [QuickBuyEventProperties.AMOUNT_SELECTION_METHOD]:
            QuickBuyEventValues.AMOUNT_SELECTION_METHOD.CUSTOM_INPUT,
          [QuickBuyEventProperties.PAY_WITH_TOKEN]: 'ETH',
        }),
      );
    });

    it('includes slider_percent when provided', () => {
      const { result } = renderHook(() => useQuickBuyAnalytics(TRADER, CAIP19));

      act(() => {
        result.current.trackAmountSelected(
          50,
          QuickBuyEventValues.AMOUNT_SELECTION_METHOD.SLIDER,
          undefined,
          25,
        );
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_QUICK_BUY_AMOUNT_SELECTED,
        expect.objectContaining({
          [QuickBuyEventProperties.SLIDER_PERCENT]: 25,
        }),
      );
    });

    it('includes preset_value when provided', () => {
      const { result } = renderHook(() => useQuickBuyAnalytics(TRADER, CAIP19));

      act(() => {
        result.current.trackAmountSelected(
          50,
          QuickBuyEventValues.AMOUNT_SELECTION_METHOD.PRESET,
          'USDC',
          undefined,
          undefined,
          50,
        );
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_QUICK_BUY_AMOUNT_SELECTED,
        expect.objectContaining({
          [QuickBuyEventProperties.PRESET_VALUE]: 50,
        }),
      );
    });

    it('does not include slider_percent when not provided', () => {
      const { result } = renderHook(() => useQuickBuyAnalytics(TRADER, CAIP19));

      act(() => {
        result.current.trackAmountSelected(
          50,
          QuickBuyEventValues.AMOUNT_SELECTION_METHOD.CUSTOM_INPUT,
        );
      });

      const call = mockTrack.mock.calls[0][1];
      expect(call).not.toHaveProperty(QuickBuyEventProperties.SLIDER_PERCENT);
    });

    it('is a no-op when traderAddress is empty', () => {
      const { result } = renderHook(() => useQuickBuyAnalytics('', CAIP19));

      act(() => {
        result.current.trackAmountSelected(
          25,
          QuickBuyEventValues.AMOUNT_SELECTION_METHOD.CUSTOM_INPUT,
        );
      });

      expect(mockTrack).not.toHaveBeenCalled();
    });

    it('is a no-op when caip19 is empty', () => {
      const { result } = renderHook(() => useQuickBuyAnalytics(TRADER, ''));

      act(() => {
        result.current.trackAmountSelected(
          25,
          QuickBuyEventValues.AMOUNT_SELECTION_METHOD.CUSTOM_INPUT,
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
          QuickBuyEventValues.AMOUNT_SELECTION_METHOD.CUSTOM_INPUT,
        );
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_QUICK_BUY_AMOUNT_SELECTED,
        expect.objectContaining({
          [QuickBuyEventProperties.TRADER_ADDRESS]: '0xOverride',
        }),
      );
    });
  });

  describe('trackQuickBuyInteracted', () => {
    it('fires QUOTE_SELECTED with quote index and count', () => {
      const { result } = renderHook(() => useQuickBuyAnalytics(TRADER, CAIP19));

      act(() => {
        result.current.trackQuoteSelected(1, 3);
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_QUICK_BUY_INTERACTED,
        expect.objectContaining({
          [QuickBuyEventProperties.INTERACTION_TYPE]:
            QuickBuyEventValues.INTERACTION_TYPE.QUOTE_SELECTED,
          [QuickBuyEventProperties.QUOTE_INDEX]: 1,
          [QuickBuyEventProperties.QUOTE_COUNT]: 3,
        }),
      );
    });

    it('fires PAY_WITH_SELECTED with token and previous token', () => {
      const { result } = renderHook(() => useQuickBuyAnalytics(TRADER, CAIP19));

      act(() => {
        result.current.trackPayWithSelected('USDC', 'ETH');
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_QUICK_BUY_INTERACTED,
        expect.objectContaining({
          [QuickBuyEventProperties.INTERACTION_TYPE]:
            QuickBuyEventValues.INTERACTION_TYPE.PAY_WITH_SELECTED,
          [QuickBuyEventProperties.PAY_WITH_TOKEN]: 'USDC',
          [QuickBuyEventProperties.PREVIOUS_PAY_WITH_TOKEN]: 'ETH',
        }),
      );
    });

    it('fires RECEIVE_TOKEN_SELECTED with token and previous token', () => {
      const { result } = renderHook(() => useQuickBuyAnalytics(TRADER, CAIP19));

      act(() => {
        result.current.trackReceiveTokenSelected('USDC', 'ETH');
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_QUICK_BUY_INTERACTED,
        expect.objectContaining({
          [QuickBuyEventProperties.INTERACTION_TYPE]:
            QuickBuyEventValues.INTERACTION_TYPE.RECEIVE_TOKEN_SELECTED,
          [QuickBuyEventProperties.RECEIVE_TOKEN]: 'USDC',
          [QuickBuyEventProperties.PREVIOUS_RECEIVE_TOKEN]: 'ETH',
        }),
      );
    });

    it('fires SLIPPAGE_CHANGED with new and previous slippage', () => {
      const { result } = renderHook(() => useQuickBuyAnalytics(TRADER, CAIP19));

      act(() => {
        result.current.trackSlippageChanged('2', '0.5');
      });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_QUICK_BUY_INTERACTED,
        expect.objectContaining({
          [QuickBuyEventProperties.INTERACTION_TYPE]:
            QuickBuyEventValues.INTERACTION_TYPE.SLIPPAGE_CHANGED,
          [QuickBuyEventProperties.SLIPPAGE]: '2',
          [QuickBuyEventProperties.PREVIOUS_SLIPPAGE]: '0.5',
        }),
      );
    });

    it('is a no-op when traderAddress is empty', () => {
      const { result } = renderHook(() => useQuickBuyAnalytics('', CAIP19));

      act(() => {
        result.current.trackQuoteSelected(0, 1);
      });

      expect(mockTrack).not.toHaveBeenCalled();
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
        QuickBuyEventValues.DISMISS_STAGE.CONFIRMATION,
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
          [QuickBuyEventProperties.TRADER_ADDRESS]: TRADER,
          [QuickBuyEventProperties.CAIP19]: CAIP19,
          [QuickBuyEventProperties.DISMISS_STAGE]:
            QuickBuyEventValues.DISMISS_STAGE.TOKEN_DETAIL,
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
          QuickBuyEventValues.AMOUNT_SELECTION_METHOD.CUSTOM_INPUT,
        );
      });

      mockTrack.mockClear();
      unmount();

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_QUICK_BUY_DISMISSED,
        expect.objectContaining({
          [QuickBuyEventProperties.AMOUNT_USD]: 42,
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
