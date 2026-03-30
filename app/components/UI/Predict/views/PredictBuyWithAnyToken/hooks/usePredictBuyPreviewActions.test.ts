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
const mockClearActiveOrder = jest.fn();
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

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      onOrderError: (...args: unknown[]) => mockOnOrderError(...args),
      onConfirmOrder: (...args: unknown[]) => mockOnConfirmOrder(...args),
      onOrderCancelled: (...args: unknown[]) => mockOnOrderCancelled(...args),
      onOrderSuccess: (...args: unknown[]) => mockOnOrderSuccess(...args),
      onPlaceOrder: (...args: unknown[]) => mockOnPlaceOrder(...args),
      onPlaceOrderEnd: (...args: unknown[]) => mockOnPlaceOrderEnd(...args),
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
    it('calls onOrderCancelled on PredictController', () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      act(() => {
        result.current.handleBack();
      });

      expect(mockOnOrderCancelled).toHaveBeenCalledTimes(1);
    });

    it('dispatches StackActions.pop', () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      act(() => {
        result.current.handleBack();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'POP' }),
      );
    });
  });

  describe('handleBackSwipe', () => {
    it('calls onOrderCancelled on PredictController', () => {
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

    it('delegates to PredictController.onConfirmOrder with isDeposit false', async () => {
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockOnConfirmOrder).toHaveBeenCalledWith({ isDeposit: false });
    });

    it('does not call placeOrder directly from handleConfirm', async () => {
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
    it('sets isConfirming to true in PLACING_ORDER state', () => {
      mockActiveOrder = { state: ActiveOrderState.PLACING_ORDER };

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

    it('sets isConfirming to false in PREVIEW state', () => {
      mockActiveOrder = { state: ActiveOrderState.PREVIEW };

      renderHook(() => usePredictBuyActions(createDefaultParams()));

      expect(mockSetIsConfirming).toHaveBeenCalledWith(false);
    });
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
