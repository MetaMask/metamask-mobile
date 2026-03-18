import { renderHook, act, waitFor } from '@testing-library/react-native';
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
const mockNavigateToConfirmation = jest.fn();
const mockClearActiveOrder = jest.fn();
const mockNavigateToBuyPreview = jest.fn();
const mockResetSelectedPaymentToken = jest.fn();
let mockApprovalRequest: { id?: string; type?: string } | undefined;
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
      approvalRequest: mockApprovalRequest,
      onConfirm: mockOnApprovalConfirm,
      onReject: mockOnApprovalReject,
    }),
  }),
);

jest.mock(
  '../../../../../Views/confirmations/hooks/useConfirmNavigation',
  () => ({
    useConfirmNavigation: () => ({
      navigateToConfirmation: mockNavigateToConfirmation,
    }),
  }),
);

jest.mock('../../../hooks/usePredictActiveOrder', () => ({
  usePredictActiveOrder: () => ({
    activeOrder: mockActiveOrder,
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

const mockOnOrderError = jest.fn();
const mockOnConfirmOrder = jest.fn();
const mockOnOrderCancelled = jest.fn();
const mockOnOrderSuccess = jest.fn();
const mockOnPlaceOrder = jest.fn();
const mockOnPlaceOrderEnd = jest.fn();
const mockOnDepositOrder = jest.fn();
const mockOnDepositOrderFailed = jest.fn();
const mockStartPayWithAnyTokenConfirmation = jest.fn();
const mockOnPayWithAnyTokenConfirmationReady = jest.fn();

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      onOrderError: (...args: unknown[]) => mockOnOrderError(...args),
      onConfirmOrder: (...args: unknown[]) => mockOnConfirmOrder(...args),
      onOrderCancelled: (...args: unknown[]) => mockOnOrderCancelled(...args),
      onOrderSuccess: (...args: unknown[]) => mockOnOrderSuccess(...args),
      onPlaceOrder: (...args: unknown[]) => mockOnPlaceOrder(...args),
      onPlaceOrderEnd: (...args: unknown[]) => mockOnPlaceOrderEnd(...args),
      onDepositOrder: (...args: unknown[]) => mockOnDepositOrder(...args),
      onDepositOrderFailed: (...args: unknown[]) =>
        mockOnDepositOrderFailed(...args),
      startPayWithAnyTokenConfirmation: (...args: unknown[]) =>
        mockStartPayWithAnyTokenConfirmation(...args),
      onPayWithAnyTokenConfirmationReady: (...args: unknown[]) =>
        mockOnPayWithAnyTokenConfirmationReady(...args),
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
  isConfirmationRoute: false,
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
    mockApprovalRequest = undefined;
    mockStartPayWithAnyTokenConfirmation.mockResolvedValue(undefined);
  });

  describe('handleBack', () => {
    it('calls onOrderEnd on PredictController', () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      act(() => {
        result.current.handleBack();
      });

      expect(mockOnOrderCancelled).toHaveBeenCalledTimes(1);
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
      expect(mockOnOrderCancelled).toHaveBeenCalledTimes(1);
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
      expect(mockOnOrderCancelled).toHaveBeenCalledTimes(1);
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

      expect(mockOnOrderCancelled).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleConfirm', () => {
    it('sets isConfirming to true', async () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockSetIsConfirming).toHaveBeenCalledWith(true);
    });

    it('delegates to PredictController.onConfirmOrder with isDeposit false when not confirmation route', async () => {
      mockRouteParams = { ...defaultRouteParams, isConfirmationRoute: false };
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockOnConfirmOrder).toHaveBeenCalledWith({ isDeposit: false });
    });

    it('delegates to PredictController.onConfirmOrder with isDeposit true when confirmation route', async () => {
      mockRouteParams = { ...defaultRouteParams, isConfirmationRoute: true };
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockOnConfirmOrder).toHaveBeenCalledWith({ isDeposit: true });
    });

    it('does not call placeOrder directly from handleConfirm', async () => {
      mockRouteParams = { ...defaultRouteParams, isConfirmationRoute: false };
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockPlaceOrder).not.toHaveBeenCalled();
    });
  });

  describe('redirect effect', () => {
    it('preserves entryPoint when redirecting to confirmation', () => {
      mockActiveOrder = { state: ActiveOrderState.REDIRECTING };

      renderHook(() => usePredictBuyActions(createDefaultParams()));

      expect(mockNavigateToConfirmation).toHaveBeenCalledWith({
        loader: 'customAmount',
        headerShown: false,
        replace: true,
        routeParams: {
          market: defaultRouteParams.market,
          outcome: defaultRouteParams.outcome,
          outcomeToken: defaultRouteParams.outcomeToken,
          entryPoint: defaultRouteParams.entryPoint,
          isConfirmationRoute: true,
          preview: createDefaultParams().preview,
        },
      });
      expect(mockStartPayWithAnyTokenConfirmation).toHaveBeenCalledTimes(1);
    });

    it('starts pay-with-any-token confirmation on confirmation route', () => {
      mockActiveOrder = { state: ActiveOrderState.REDIRECTING };
      mockRouteParams = { ...defaultRouteParams, isConfirmationRoute: true };

      renderHook(() => usePredictBuyActions(createDefaultParams()));

      expect(mockNavigateToConfirmation).not.toHaveBeenCalled();
      expect(mockStartPayWithAnyTokenConfirmation).toHaveBeenCalledTimes(1);
    });

    it('marks pay-with-any-token confirmation ready when approval request appears on confirmation route', () => {
      mockActiveOrder = {
        state: ActiveOrderState.CALLING_PAY_WITH_ANY_TOKEN,
      };
      mockRouteParams = { ...defaultRouteParams, isConfirmationRoute: true };
      mockApprovalRequest = { id: 'approval-1', type: 'transaction' };

      renderHook(() => usePredictBuyActions(createDefaultParams()));

      expect(mockOnPayWithAnyTokenConfirmationReady).toHaveBeenCalledTimes(1);
    });
  });

  describe('confirming state effect', () => {
    it.each([
      ActiveOrderState.DEPOSIT,
      ActiveOrderState.DEPOSITING,
      ActiveOrderState.PLACING_ORDER,
    ])('sets isConfirming to true in %s state', (state) => {
      mockActiveOrder = { state };

      renderHook(() => usePredictBuyActions(createDefaultParams()));

      expect(mockSetIsConfirming).toHaveBeenCalledWith(true);
    });

    it('sets isConfirming to true in PLACE_ORDER state', async () => {
      mockActiveOrder = { state: ActiveOrderState.PLACE_ORDER };
      mockPlaceOrder.mockResolvedValue({ status: 'deposit_required' });

      renderHook(() => usePredictBuyActions(createDefaultParams()));

      await waitFor(() => {
        expect(mockSetIsConfirming).toHaveBeenCalledWith(true);
      });
    });

    it.each([ActiveOrderState.PREVIEW, ActiveOrderState.PAY_WITH_ANY_TOKEN])(
      'sets isConfirming to false in %s state',
      (state) => {
        mockActiveOrder = { state };

        renderHook(() => usePredictBuyActions(createDefaultParams()));

        expect(mockSetIsConfirming).toHaveBeenCalledWith(false);
      },
    );
  });

  describe('success effect', () => {
    it('calls onPlaceOrderEnd and pops navigation in SUCCESS state', () => {
      mockActiveOrder = { state: ActiveOrderState.SUCCESS };

      renderHook(() => usePredictBuyActions(createDefaultParams()));

      expect(mockOnPlaceOrderEnd).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'POP' }),
      );
    });
  });

  describe('deposit confirmation effect', () => {
    it('calls onDepositOrder, navigates to buy preview and confirms approval', () => {
      mockActiveOrder = { state: ActiveOrderState.DEPOSIT };
      mockRouteParams = { ...defaultRouteParams, isConfirmationRoute: true };

      renderHook(() => usePredictBuyActions(createDefaultParams()));

      expect(mockOnDepositOrder).toHaveBeenCalledTimes(1);
      expect(mockNavigateToBuyPreview).toHaveBeenCalledWith(
        {
          market: defaultRouteParams.market,
          outcome: defaultRouteParams.outcome,
          outcomeToken: defaultRouteParams.outcomeToken,
          animationEnabled: false,
          entryPoint: defaultRouteParams.entryPoint,
          isConfirming: true,
          preview: { ...createDefaultParams().preview },
        },
        { replace: true },
      );
      expect(mockOnApprovalConfirm).toHaveBeenCalledWith({
        deleteAfterResult: true,
        waitForResult: true,
        handleErrors: false,
      });
    });

    it('throws error in DEPOSIT state on confirmation route without preview', () => {
      mockActiveOrder = { state: ActiveOrderState.DEPOSIT };
      mockRouteParams = { ...defaultRouteParams, isConfirmationRoute: true };

      const params = createDefaultParams();
      params.preview = null;

      expect(() => renderHook(() => usePredictBuyActions(params))).toThrow(
        'Preview is required',
      );
    });
  });

  describe('place order effect', () => {
    it('calls placeOrder when state is PLACE_ORDER', async () => {
      mockActiveOrder = { state: ActiveOrderState.PLACE_ORDER };
      mockPlaceOrder.mockResolvedValue({ status: 'deposit_required' });

      renderHook(() => usePredictBuyActions(createDefaultParams()));

      await waitFor(() => {
        expect(mockPlaceOrder).toHaveBeenCalledWith({
          analyticsProperties: { marketId: 'market-1' },
          preview: createDefaultParams().preview,
        });
      });

      expect(mockOnPlaceOrder).toHaveBeenCalledTimes(1);
      expect(mockOnOrderError).toHaveBeenCalledTimes(1);
    });
  });
});
