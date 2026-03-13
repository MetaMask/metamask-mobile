import { renderHook, act } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import { usePredictBuyActions } from './usePredictBuyPreviewActions';
import {
  ActiveOrderState,
  OrderPreview,
  PlaceOrderParams,
} from '../../../types';
import { PlaceOrderOutcome } from '../../../hooks/usePredictPlaceOrder';

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockOnApprovalReject = jest.fn();
const mockOnApprovalConfirm = jest.fn();
const mockUpdateActiveOrder = jest.fn();
const mockClearActiveOrder = jest.fn();
const mockNavigateToBuyPreview = jest.fn();
const mockResetSelectedPaymentToken = jest.fn();
let mockActiveOrder: {
  batchId?: string | null;
  state?: string;
} | null = null;
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

jest.mock(
  '../../../../../Views/confirmations/hooks/useApprovalRequest',
  () => ({
    __esModule: true,
    default: () => ({
      onConfirm: mockOnApprovalConfirm,
      onReject: mockOnApprovalReject,
    }),
  }),
);

jest.mock(
  '../../../../../Views/confirmations/hooks/useConfirmNavigation',
  () => ({
    useConfirmNavigation: () => ({
      navigateToConfirmation: jest.fn(),
    }),
  }),
);

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

const mockOnPlaceOrderError = jest.fn();
const mockOnOrderResultError = jest.fn();
const mockOnDepositFailed = jest.fn();
const mockOnConfirmOrder = jest.fn();
const mockOnOrderEnd = jest.fn();
const mockOnConfirmationRedirected = jest.fn();

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      onPlaceOrderError: (...args: unknown[]) => mockOnPlaceOrderError(...args),
      onOrderResultError: (...args: unknown[]) =>
        mockOnOrderResultError(...args),
      onDepositFailed: (...args: unknown[]) => mockOnDepositFailed(...args),
      onConfirmOrder: (...args: unknown[]) => mockOnConfirmOrder(...args),
      onOrderEnd: (...args: unknown[]) => mockOnOrderEnd(...args),
      onConfirmationRedirected: (...args: unknown[]) =>
        mockOnConfirmationRedirected(...args),
    },
  },
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

const createDefaultParams = (): Parameters<typeof usePredictBuyActions>[0] => ({
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
    it('calls onOrderEnd on PredictController', () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      act(() => {
        result.current.handleBack();
      });

      expect(mockOnOrderEnd).toHaveBeenCalledTimes(1);
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

    it('rejects pending approval when in PAY_WITH_ANY_TOKEN state', () => {
      mockActiveOrder = { state: ActiveOrderState.PAY_WITH_ANY_TOKEN };
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      act(() => {
        result.current.handleBack();
      });

      expect(mockOnApprovalReject).toHaveBeenCalledTimes(1);
      expect(mockOnOrderEnd).toHaveBeenCalledTimes(1);
    });

    it('does not reject approval when in PREVIEW state', () => {
      mockActiveOrder = { state: ActiveOrderState.PREVIEW };
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      act(() => {
        result.current.handleBack();
      });

      expect(mockOnApprovalReject).not.toHaveBeenCalled();
      expect(mockOnOrderEnd).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleBackSwipe', () => {
    it('calls onOrderEnd on PredictController', () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      act(() => {
        result.current.handleBackSwipe();
      });

      expect(mockOnOrderEnd).toHaveBeenCalledTimes(1);
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

      expect(mockOnOrderEnd).toHaveBeenCalledTimes(1);
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('handleConfirm', () => {
    it('sets isConfirming to true', async () => {
      mockPlaceOrder.mockResolvedValue({
        status: 'success',
        result: { success: true, response: undefined },
      });
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockSetIsConfirming).toHaveBeenCalledWith(true);
    });

    it('delegates to PredictController.onConfirmOrder', async () => {
      mockPlaceOrder.mockResolvedValue({
        status: 'success',
        result: { success: true, response: undefined },
      });
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockOnConfirmOrder).toHaveBeenCalledWith(false);
    });

    it('calls placeOrder with preview and analyticsProperties when not in confirmation', async () => {
      mockRouteParams = { ...defaultRouteParams, isConfirmation: false };
      mockPlaceOrder.mockResolvedValue({
        status: 'success',
        result: { success: true, response: undefined },
      });
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

    it('delegates to onOrderResultError on placeOrder error', async () => {
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

      expect(mockOnOrderResultError).toHaveBeenCalledTimes(1);
      expect(mockSetIsConfirming).toHaveBeenCalledWith(false);
    });

    it('delegates to onOrderResultError on order_not_filled', async () => {
      mockRouteParams = { ...defaultRouteParams, isConfirmation: false };
      mockPlaceOrder.mockResolvedValue({ status: 'order_not_filled' });
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockOnOrderResultError).toHaveBeenCalledTimes(1);
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
      expect(mockOnConfirmOrder).toHaveBeenCalledWith(true);
      expect(mockPlaceOrder).not.toHaveBeenCalled();
    });

    it('delegates to onOrderResultError on deposit_required', async () => {
      mockRouteParams = { ...defaultRouteParams, isConfirmation: false };
      mockPlaceOrder.mockResolvedValue({ status: 'deposit_required' });
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockOnOrderResultError).toHaveBeenCalledTimes(1);
      expect(mockSetIsConfirming).toHaveBeenCalledWith(false);
    });

    it('delegates to onOrderResultError on deposit_in_progress', async () => {
      mockRouteParams = { ...defaultRouteParams, isConfirmation: false };
      mockPlaceOrder.mockResolvedValue({ status: 'deposit_in_progress' });
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockOnOrderResultError).toHaveBeenCalledTimes(1);
      expect(mockSetIsConfirming).toHaveBeenCalledWith(false);
    });

    it('throws error when no preview available', async () => {
      mockRouteParams = {
        ...defaultRouteParams,
        isConfirmation: false,
        preview: null,
      };
      const params = createDefaultParams();
      params.preview = undefined;
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

    it('delegates to PredictController.onDepositFailed with error message', async () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleDepositFailed('Deposit failed');
      });

      expect(mockOnDepositFailed).toHaveBeenCalledWith('Deposit failed');
    });

    it('uses default error message when none provided', async () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleDepositFailed();
      });

      expect(mockOnDepositFailed).toHaveBeenCalledWith(
        'predict.deposit.error_description',
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

    it('calls onOrderEnd on PredictController', () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      act(() => {
        result.current.handlePlaceOrderSuccess();
      });

      expect(mockOnOrderEnd).toHaveBeenCalledTimes(1);
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

    it('delegates to PredictController.onPlaceOrderError', () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      act(() => {
        result.current.handlePlaceOrderError();
      });

      expect(mockOnPlaceOrderError).toHaveBeenCalledTimes(1);
    });
  });
});
