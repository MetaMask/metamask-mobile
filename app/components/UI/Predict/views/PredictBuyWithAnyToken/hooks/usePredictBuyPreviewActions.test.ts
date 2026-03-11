import { renderHook, act } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import { usePredictBuyActions } from './usePredictBuyPreviewActions';
import { ActiveOrderState, OrderPreview , PlaceOrderParams } from '../../../types';
import { PREDICT_BALANCE_TOKEN_KEY } from '../../../constants/transactions';
import { PlaceOrderOutcome } from '../../../hooks/usePredictPlaceOrder';

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockOnReject = jest.fn();
const mockOnApprovalConfirm = jest.fn();
const mockTriggerPayWithAnyToken = jest.fn();
const mockUpdateActiveOrder = jest.fn();
const mockClearActiveOrder = jest.fn();
const mockNavigateToBuyPreview = jest.fn();
const mockResetSelectedPaymentToken = jest.fn();
let mockActiveOrder: { batchId?: string | null } | null = null;
let mockRouteParams: Record<string, unknown> = {};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    dispatch: mockDispatch,
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

jest.mock('../../../hooks/usePredictNavigation', () => ({
  usePredictNavigation: () => ({
    navigateToBuyPreview: mockNavigateToBuyPreview,
  }),
}));

jest.mock('../../../../../Views/confirmations/hooks/useConfirmActions', () => ({
  useConfirmActions: () => ({
    onReject: mockOnReject,
  }),
}));

jest.mock(
  '../../../../../Views/confirmations/hooks/useApprovalRequest',
  () => ({
    __esModule: true,
    default: () => ({
      onConfirm: mockOnApprovalConfirm,
    }),
  }),
);

jest.mock('../../../hooks/usePredictPayWithAnyToken', () => ({
  usePredictPayWithAnyToken: () => ({
    triggerPayWithAnyToken: mockTriggerPayWithAnyToken,
  }),
}));

jest.mock('../../../hooks/usePredictActiveOrder', () => ({
  usePredictActiveOrder: () => ({
    activeOrder: mockActiveOrder,
    updateActiveOrder: mockUpdateActiveOrder,
    clearActiveOrder: mockClearActiveOrder,
  }),
}));

jest.mock('../../../hooks/usePredictPaymentToken', () => ({
  usePredictPaymentToken: () => ({
    resetSelectedPaymentToken: mockResetSelectedPaymentToken,
  }),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockPlaceOrder = jest.fn<
  Promise<PlaceOrderOutcome>,
  [PlaceOrderParams]
>();
const mockSetIsConfirming = jest.fn();

const defaultRouteParams = {
  market: { id: 'market-1' },
  outcome: { id: 'outcome-1' },
  outcomeToken: { id: 'token-1' },
  entryPoint: 'predict_feed',
  isConfirmation: false,
  preview: null,
};

const createDefaultParams = () => ({
  currentValue: 100,
  preview: {
    minAmountReceived: 180,
    fees: { totalFee: 5 },
  } as OrderPreview,
  analyticsProperties: { marketId: 'market-1' },
  placeOrder: mockPlaceOrder,
  depositAmount: 0,
  setIsConfirming: mockSetIsConfirming,
});

describe('usePredictBuyActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveOrder = null;
    mockRouteParams = { ...defaultRouteParams };
  });

  describe('handleBack', () => {
    it('calls clearActiveOrder', () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      act(() => {
        result.current.handleBack();
      });

      expect(mockClearActiveOrder).toHaveBeenCalledTimes(1);
    });

    it('dispatches StackActions.pop', () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      act(() => {
        result.current.handleBack();
      });

      expect(mockDispatch).toHaveBeenCalledWith(StackActions.pop());
    });
  });

  describe('handleBackSwipe', () => {
    it('calls clearActiveOrder', () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      act(() => {
        result.current.handleBackSwipe();
      });

      expect(mockClearActiveOrder).toHaveBeenCalledTimes(1);
    });

    it('dispatches StackActions.pop when not in confirmation mode', () => {
      mockRouteParams = { ...defaultRouteParams, isConfirmation: false };
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      act(() => {
        result.current.handleBackSwipe();
      });

      expect(mockDispatch).toHaveBeenCalledWith(StackActions.pop());
    });

    it('does not dispatch pop when in confirmation mode', () => {
      mockRouteParams = { ...defaultRouteParams, isConfirmation: true };
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      act(() => {
        result.current.handleBackSwipe();
      });

      expect(mockClearActiveOrder).toHaveBeenCalledTimes(1);
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('handleTokenSelected', () => {
    it('clears error on active order', async () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleTokenSelected({ tokenKey: 'some-token' });
      });

      expect(mockUpdateActiveOrder).toHaveBeenCalledWith({ error: null });
    });

    it('triggers payWithAnyToken for non-predict-balance token when not in confirmation', async () => {
      mockRouteParams = { ...defaultRouteParams, isConfirmation: false };
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleTokenSelected({
          tokenKey: 'other-token',
        });
      });

      expect(mockTriggerPayWithAnyToken).toHaveBeenCalledWith(
        expect.objectContaining({
          market: defaultRouteParams.market,
          outcome: defaultRouteParams.outcome,
          outcomeToken: defaultRouteParams.outcomeToken,
        }),
      );
    });

    it('sets state to PAY_WITH_ANY_TOKEN for non-predict-balance token', async () => {
      mockRouteParams = { ...defaultRouteParams, isConfirmation: false };
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleTokenSelected({
          tokenKey: 'other-token',
        });
      });

      expect(mockUpdateActiveOrder).toHaveBeenCalledWith({
        state: ActiveOrderState.PAY_WITH_ANY_TOKEN,
      });
    });

    it('sets state to PREVIEW for predict-balance token in confirmation mode', async () => {
      mockRouteParams = { ...defaultRouteParams, isConfirmation: true };
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleTokenSelected({
          tokenKey: PREDICT_BALANCE_TOKEN_KEY,
        });
      });

      expect(mockUpdateActiveOrder).toHaveBeenCalledWith({
        state: ActiveOrderState.PREVIEW,
      });
    });

    it('calls onReject in confirmation mode for predict-balance token', async () => {
      mockRouteParams = { ...defaultRouteParams, isConfirmation: true };
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleTokenSelected({
          tokenKey: PREDICT_BALANCE_TOKEN_KEY,
        });
      });

      expect(mockOnReject).toHaveBeenCalledWith(undefined, true);
    });

    it('does not trigger payWithAnyToken for predict-balance token in non-confirmation', async () => {
      mockRouteParams = { ...defaultRouteParams, isConfirmation: false };
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleTokenSelected({
          tokenKey: PREDICT_BALANCE_TOKEN_KEY,
        });
      });

      expect(mockTriggerPayWithAnyToken).not.toHaveBeenCalled();
    });

    it('returns early for non-predict-balance token in confirmation mode', async () => {
      mockRouteParams = { ...defaultRouteParams, isConfirmation: true };
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleTokenSelected({
          tokenKey: 'other-token',
        });
      });

      expect(mockUpdateActiveOrder).toHaveBeenCalledWith({ error: null });
      expect(mockOnReject).not.toHaveBeenCalled();
      expect(mockTriggerPayWithAnyToken).not.toHaveBeenCalled();
    });
  });

  describe('handleConfirm', () => {
    it('sets isConfirming to true', async () => {
      mockPlaceOrder.mockResolvedValue({ status: 'success', result: {} });
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockSetIsConfirming).toHaveBeenCalledWith(true);
    });

    it('clears error on active order', async () => {
      mockPlaceOrder.mockResolvedValue({ status: 'success', result: {} });
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockUpdateActiveOrder).toHaveBeenCalledWith({ error: null });
    });

    it('calls placeOrder with preview and analyticsProperties when not in confirmation', async () => {
      mockRouteParams = { ...defaultRouteParams, isConfirmation: false };
      mockPlaceOrder.mockResolvedValue({ status: 'success', result: {} });
      const params = createDefaultParams();
      const { result } = renderHook(() => usePredictBuyActions(params));

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockPlaceOrder).toHaveBeenCalledWith({
        preview: params.preview,
        analyticsProperties: params.analyticsProperties,
      });
    });

    it('sets state to PLACING_ORDER before calling placeOrder', async () => {
      mockRouteParams = { ...defaultRouteParams, isConfirmation: false };
      mockPlaceOrder.mockResolvedValue({ status: 'success', result: {} });
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      const placingOrderCall = mockUpdateActiveOrder.mock.calls.find(
        (call: [Record<string, unknown>]) =>
          call[0].state === ActiveOrderState.PLACING_ORDER,
      );
      expect(placingOrderCall).toBeDefined();
    });

    it('sets state back to PREVIEW on placeOrder error', async () => {
      mockRouteParams = { ...defaultRouteParams, isConfirmation: false };
      mockPlaceOrder.mockResolvedValue({
        status: 'error',
        error: 'Order failed',
      });
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockUpdateActiveOrder).toHaveBeenCalledWith({
        state: ActiveOrderState.PREVIEW,
      });
      expect(mockSetIsConfirming).toHaveBeenCalledWith(false);
    });

    it('sets state back to PREVIEW on order_not_filled', async () => {
      mockRouteParams = { ...defaultRouteParams, isConfirmation: false };
      mockPlaceOrder.mockResolvedValue({ status: 'order_not_filled' });
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockUpdateActiveOrder).toHaveBeenCalledWith({
        state: ActiveOrderState.PREVIEW,
      });
      expect(mockSetIsConfirming).toHaveBeenCalledWith(false);
    });

    it('calls onApprovalConfirm when isConfirmation is true', async () => {
      mockRouteParams = { ...defaultRouteParams, isConfirmation: true };
      mockOnApprovalConfirm.mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockOnApprovalConfirm).toHaveBeenCalledWith({
        deleteAfterResult: true,
        waitForResult: true,
        handleErrors: false,
      });
      expect(mockPlaceOrder).not.toHaveBeenCalled();
    });

    it('throws error when no preview available', async () => {
      mockRouteParams = {
        ...defaultRouteParams,
        isConfirmation: false,
        preview: null,
      };
      const params = createDefaultParams();
      params.preview = null;
      const { result } = renderHook(() => usePredictBuyActions(params));

      await expect(
        act(async () => {
          await result.current.handleConfirm();
        }),
      ).rejects.toThrow('Preview is required');
    });
  });

  describe('handleDepositFailed', () => {
    it('sets isConfirming to false', async () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleDepositFailed('Deposit failed');
      });

      expect(mockSetIsConfirming).toHaveBeenCalledWith(false);
    });

    it('updates active order with error and PAY_WITH_ANY_TOKEN state', async () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleDepositFailed('Deposit failed');
      });

      expect(mockUpdateActiveOrder).toHaveBeenCalledWith({
        state: ActiveOrderState.PAY_WITH_ANY_TOKEN,
        error: 'Deposit failed',
        batchId: null,
      });
    });

    it('triggers payWithAnyToken flow', async () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleDepositFailed();
      });

      expect(mockTriggerPayWithAnyToken).toHaveBeenCalledWith({
        market: defaultRouteParams.market,
        outcome: defaultRouteParams.outcome,
        outcomeToken: defaultRouteParams.outcomeToken,
      });
    });

    it('clears batchId on failure', async () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleDepositFailed('error');
      });

      expect(mockUpdateActiveOrder).toHaveBeenCalledWith(
        expect.objectContaining({ batchId: null }),
      );
    });

    it('uses default error message when none provided', async () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleDepositFailed();
      });

      expect(mockUpdateActiveOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'predict.deposit.error_description',
        }),
      );
    });
  });

  describe('handlePlaceOrderSuccess', () => {
    it('sets isConfirming to false', () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      act(() => {
        result.current.handlePlaceOrderSuccess();
      });

      expect(mockSetIsConfirming).toHaveBeenCalledWith(false);
    });

    it('clears active order', () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      act(() => {
        result.current.handlePlaceOrderSuccess();
      });

      expect(mockClearActiveOrder).toHaveBeenCalledTimes(1);
    });

    it('dispatches StackActions.pop', () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      act(() => {
        result.current.handlePlaceOrderSuccess();
      });

      expect(mockDispatch).toHaveBeenCalledWith(StackActions.pop());
    });
  });

  describe('handlePlaceOrderError', () => {
    it('sets isConfirming to false', () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      act(() => {
        result.current.handlePlaceOrderError();
      });

      expect(mockSetIsConfirming).toHaveBeenCalledWith(false);
    });

    it('sets state back to PREVIEW', () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      act(() => {
        result.current.handlePlaceOrderError();
      });

      expect(mockUpdateActiveOrder).toHaveBeenCalledWith({
        state: ActiveOrderState.PREVIEW,
      });
    });

    it('resets selected payment token', () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      act(() => {
        result.current.handlePlaceOrderError();
      });

      expect(mockResetSelectedPaymentToken).toHaveBeenCalledTimes(1);
    });
  });
});
