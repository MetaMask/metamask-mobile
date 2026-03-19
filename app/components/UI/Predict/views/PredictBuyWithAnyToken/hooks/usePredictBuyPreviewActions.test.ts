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
const mockGetAndClearDepositPreview = jest.fn();
const mockPayWithAnyTokenConfirmation = jest.fn();

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
      getAndClearDepositPreview: (...args: unknown[]) =>
        mockGetAndClearDepositPreview(...args),
      payWithAnyTokenConfirmation: (...args: unknown[]) =>
        mockPayWithAnyTokenConfirmation(...args),
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
    mockGetAndClearDepositPreview.mockReturnValue(null);
    mockPayWithAnyTokenConfirmation.mockResolvedValue(undefined);
  });

  describe('handleBack', () => {
    it('calls onOrderCancelled on PredictController', () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      act(() => {
        result.current.handleBack();
      });

      expect(mockOnOrderCancelled).toHaveBeenCalledTimes(1);
    });

    it('calls onOrderCancelled when in PAY_WITH_ANY_TOKEN state', () => {
      mockActiveOrder = { state: ActiveOrderState.PAY_WITH_ANY_TOKEN };
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      act(() => {
        result.current.handleBack();
      });

      expect(mockOnOrderCancelled).toHaveBeenCalledTimes(1);
    });

    it('calls onOrderCancelled when in PREVIEW state', () => {
      mockActiveOrder = { state: ActiveOrderState.PREVIEW };
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      act(() => {
        result.current.handleBack();
      });

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

    it('delegates to PredictController.onConfirmOrder with isDeposit false when state is PREVIEW', async () => {
      mockActiveOrder = { state: ActiveOrderState.PREVIEW };
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockOnConfirmOrder).toHaveBeenCalledWith({ isDeposit: false });
    });

    it('delegates to PredictController.onConfirmOrder with isDeposit true when state is PAY_WITH_ANY_TOKEN', async () => {
      mockActiveOrder = { state: ActiveOrderState.PAY_WITH_ANY_TOKEN };
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockOnConfirmOrder).toHaveBeenCalledWith({ isDeposit: true });
    });

    it('does not call placeOrder directly from handleConfirm', async () => {
      mockActiveOrder = { state: ActiveOrderState.PREVIEW };
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockPlaceOrder).not.toHaveBeenCalled();
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
    it('calls onDepositOrder with live preview and confirms approval', () => {
      mockActiveOrder = { state: ActiveOrderState.DEPOSIT };

      renderHook(() => usePredictBuyActions(createDefaultParams()));

      expect(mockOnDepositOrder).toHaveBeenCalledWith(
        createDefaultParams().preview,
      );
      expect(mockOnApprovalConfirm).toHaveBeenCalledWith({
        deleteAfterResult: true,
        waitForResult: true,
        handleErrors: false,
      });
    });
  });

  describe('place order effect', () => {
    it('calls placeOrder with livePreview when no deposit preview is stored', async () => {
      mockActiveOrder = { state: ActiveOrderState.PLACE_ORDER };
      mockGetAndClearDepositPreview.mockReturnValue(null);
      mockPlaceOrder.mockResolvedValue({
        status: 'success',
        result: {} as never,
      });

      renderHook(() => usePredictBuyActions(createDefaultParams()));

      await waitFor(() => {
        expect(mockPlaceOrder).toHaveBeenCalledWith({
          analyticsProperties: { marketId: 'market-1' },
          preview: createDefaultParams().preview,
        });
      });

      expect(mockOnPlaceOrder).toHaveBeenCalledTimes(1);
    });

    it('calls placeOrder with deposit preview when available', async () => {
      mockActiveOrder = { state: ActiveOrderState.PLACE_ORDER };
      const depositPreview = {
        ...createDefaultParams().preview,
        timestamp: 999,
      } as OrderPreview;
      mockGetAndClearDepositPreview.mockReturnValue(depositPreview);
      mockPlaceOrder.mockResolvedValue({
        status: 'success',
        result: {} as never,
      });

      renderHook(() => usePredictBuyActions(createDefaultParams()));

      await waitFor(() => {
        expect(mockPlaceOrder).toHaveBeenCalledWith({
          analyticsProperties: { marketId: 'market-1' },
          preview: depositPreview,
        });
      });

      expect(mockOnPlaceOrder).toHaveBeenCalledTimes(1);
    });

    it('calls onOrderError when no preview is available', async () => {
      mockActiveOrder = { state: ActiveOrderState.PLACE_ORDER };
      mockGetAndClearDepositPreview.mockReturnValue(null);
      const params = createDefaultParams();
      params.preview = null;

      renderHook(() => usePredictBuyActions(params));

      await waitFor(() => {
        expect(mockOnOrderError).toHaveBeenCalledTimes(1);
      });

      expect(mockPlaceOrder).not.toHaveBeenCalled();
    });

    it('calls onOrderError when placeOrder rejects', async () => {
      mockActiveOrder = { state: ActiveOrderState.PLACE_ORDER };
      mockGetAndClearDepositPreview.mockReturnValue(null);
      mockPlaceOrder.mockRejectedValue(new Error('network error'));

      renderHook(() => usePredictBuyActions(createDefaultParams()));

      await waitFor(() => {
        expect(mockOnOrderError).toHaveBeenCalledTimes(1);
      });
    });
  });
});
