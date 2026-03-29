import { act, renderHook, waitFor } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import { usePredictBuyActions } from './usePredictBuyActions';
import { PREDICT_ERROR_CODES } from '../../../constants/errors';
import {
  ActiveOrderState,
  OrderPreview,
  PlaceOrderParams,
  Side,
} from '../../../types';

const mockDispatch = jest.fn();
const mockOnConfirmActionsReject = jest.fn();
const mockOnApprovalConfirm = jest.fn();
const mockUnsubscribe = jest.fn();
const mockShowOrderPlacedToast = jest.fn();
const mockInvalidateOrderQueries = jest.fn();
const mockTrackPredictOrderEvent = jest.fn();
const mockPlaceOrder = jest.fn<Promise<unknown>, [PlaceOrderParams]>();
const mockOnPlaceOrderEnd = jest.fn();
const mockOnOrderCancelled = jest.fn();
const mockInitPayWithAnyToken = jest.fn();
const mockSetIsConfirming = jest.fn();
const mockTransitionEndUnsubscribe = jest.fn();
const mockBeforeRemoveUnsubscribe = jest.fn();
const mockTransitionEndCallbacks: ((e: {
  data: { closing: boolean };
}) => void)[] = [];
const mockBeforeRemoveCallbacks: (() => void)[] = [];

let mockActiveOrder: {
  batchId?: string | null;
  state?: ActiveOrderState;
} | null = null;
let mockPayWithAnyTokenEnabled = true;

const createAddListenerMock =
  () =>
  (event: string, callback: (e?: { data: { closing: boolean } }) => void) => {
    if (event === 'transitionEnd') {
      mockTransitionEndCallbacks.push(
        callback as (e: { data: { closing: boolean } }) => void,
      );
      callback({ data: { closing: false } });
      return mockTransitionEndUnsubscribe;
    }

    if (event === 'beforeRemove') {
      mockBeforeRemoveCallbacks.push(callback as () => void);
      return () => {
        callback();
        mockBeforeRemoveUnsubscribe();
      };
    }

    return mockUnsubscribe;
  };

const mockAddListener = jest.fn(createAddListenerMock());

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    dispatch: mockDispatch,
    addListener: mockAddListener,
  }),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => mockPayWithAnyTokenEnabled),
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

jest.mock('../../../../../Views/confirmations/hooks/useConfirmActions', () => ({
  useConfirmActions: () => ({
    onReject: mockOnConfirmActionsReject,
  }),
}));

jest.mock('../../../hooks/usePredictActiveOrder', () => ({
  usePredictActiveOrder: () => ({
    activeOrder: mockActiveOrder,
  }),
}));

jest.mock('../../../hooks/usePredictTrading', () => ({
  usePredictTrading: () => ({
    placeOrder: mockPlaceOrder,
    initPayWithAnyToken: mockInitPayWithAnyToken,
  }),
}));

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      onPlaceOrderEnd: (...args: unknown[]) => mockOnPlaceOrderEnd(...args),
      onOrderCancelled: (...args: unknown[]) => mockOnOrderCancelled(...args),
      trackPredictOrderEvent: (...args: unknown[]) =>
        mockTrackPredictOrderEvent(...args),
      initPayWithAnyToken: (...args: unknown[]) =>
        mockInitPayWithAnyToken(...args),
    },
  },
}));

const createDefaultParams = (): Parameters<typeof usePredictBuyActions>[0] => ({
  preview: {
    marketId: 'market-1',
    outcomeId: 'outcome-1',
    outcomeTokenId: 'token-1',
    timestamp: Date.now(),
    side: Side.BUY,
    sharePrice: 0.5,
    maxAmountSpent: 175,
    minAmountReceived: 180,
    slippage: 0.005,
    tickSize: 0.01,
    minOrderSize: 0.01,
    negRisk: false,
    fees: { totalFee: 5 },
  } as OrderPreview,
  analyticsProperties: { marketId: 'market-1' },
  setIsConfirming: mockSetIsConfirming,
  showOrderPlacedToast: mockShowOrderPlacedToast,
  invalidateOrderQueries: mockInvalidateOrderQueries,
});

describe('usePredictBuyActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveOrder = null;
    mockPayWithAnyTokenEnabled = true;
    mockInitPayWithAnyToken.mockResolvedValue(undefined);
    mockTransitionEndCallbacks.length = 0;
    mockBeforeRemoveCallbacks.length = 0;
    mockAddListener.mockImplementation(createAddListenerMock());
  });

  describe('mount effect', () => {
    it('tracks an initiated order event on mount', () => {
      renderHook(() => usePredictBuyActions(createDefaultParams()));

      expect(mockTrackPredictOrderEvent).toHaveBeenCalledWith({
        status: 'initiated',
        analyticsProperties: { marketId: 'market-1' },
        sharePrice: undefined,
      });
    });

    it('calls initPayWithAnyToken on mount when pay with any token is enabled', () => {
      renderHook(() => usePredictBuyActions(createDefaultParams()));

      expect(mockInitPayWithAnyToken).toHaveBeenCalledTimes(1);
    });

    it('does not call initPayWithAnyToken when pay with any token is disabled', () => {
      mockPayWithAnyTokenEnabled = false;

      renderHook(() => usePredictBuyActions(createDefaultParams()));

      expect(mockInitPayWithAnyToken).not.toHaveBeenCalled();
    });

    it('rejects approval request on unmount when pay with any token is enabled', () => {
      const { unmount } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      unmount();

      expect(mockTransitionEndUnsubscribe).toHaveBeenCalledTimes(1);
      expect(mockBeforeRemoveUnsubscribe).toHaveBeenCalledTimes(1);
      expect(mockOnConfirmActionsReject).toHaveBeenCalledTimes(1);
    });

    it('only calls initPayWithAnyToken once even if transitionEnd fires again', () => {
      const transitionEndCallbacks: ((e: {
        data: { closing: boolean };
      }) => void)[] = [];

      mockAddListener.mockImplementation(
        (
          event: string,
          callback:
            | ((e: { data: { closing: boolean } }) => void)
            | (() => void),
        ) => {
          if (event === 'transitionEnd') {
            const typedCallback = callback as (e: {
              data: { closing: boolean };
            }) => void;

            transitionEndCallbacks.push(typedCallback);
            typedCallback({ data: { closing: false } });

            return mockTransitionEndUnsubscribe;
          }

          if (event === 'beforeRemove') {
            return mockBeforeRemoveUnsubscribe;
          }

          return mockUnsubscribe;
        },
      );

      renderHook(() => usePredictBuyActions(createDefaultParams()));

      act(() => {
        transitionEndCallbacks[0]({ data: { closing: false } });
      });

      expect(mockInitPayWithAnyToken).toHaveBeenCalledTimes(1);
    });

    it('does not initialize pay with any token when transitionEnd is closing', () => {
      renderHook(() => usePredictBuyActions(createDefaultParams()));

      mockInitPayWithAnyToken.mockClear();

      act(() => {
        mockTransitionEndCallbacks[0]({ data: { closing: true } });
      });

      expect(mockInitPayWithAnyToken).not.toHaveBeenCalled();
    });

    it('does not register cleanup listeners when pay with any token is disabled', () => {
      mockPayWithAnyTokenEnabled = false;

      const { unmount } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      unmount();

      expect(mockOnConfirmActionsReject).not.toHaveBeenCalled();
      expect(mockOnPlaceOrderEnd).not.toHaveBeenCalled();
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

    it('calls placeOrder with preview and analyticsProperties', async () => {
      const params = createDefaultParams();
      const { result } = renderHook(() => usePredictBuyActions(params));

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockPlaceOrder).toHaveBeenCalledWith({
        analyticsProperties: { marketId: 'market-1' },
        preview: params.preview,
      });
    });

    it('calls approval confirm when the order is paying with any token', async () => {
      mockActiveOrder = { state: ActiveOrderState.PAY_WITH_ANY_TOKEN };
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
    });

    it('does not call placeOrder when preview is null', async () => {
      const params = createDefaultParams();
      params.preview = null;
      const { result } = renderHook(() => usePredictBuyActions(params));

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockPlaceOrder).not.toHaveBeenCalled();
    });

    it('returns a preview not available error when preview is null', async () => {
      const params = createDefaultParams();
      params.preview = null;
      const { result } = renderHook(() => usePredictBuyActions(params));

      let outcome;
      await act(async () => {
        outcome = await result.current.handleConfirm();
      });

      expect(outcome).toEqual({
        status: 'error',
        error: PREDICT_ERROR_CODES.PREVIEW_NOT_AVAILABLE,
      });
    });
  });

  describe('placeOrder helper', () => {
    it('returns a success result when placeOrder resolves', async () => {
      const placeOrderResult = { success: true };
      mockPlaceOrder.mockResolvedValue(placeOrderResult);
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      let outcome;
      await act(async () => {
        outcome = await result.current.placeOrder({
          analyticsProperties: { marketId: 'market-1' },
          preview: createDefaultParams().preview as OrderPreview,
        });
      });

      expect(outcome).toEqual({
        status: 'success',
        result: placeOrderResult,
      });
    });

    it('returns the error message when placeOrder rejects with an Error', async () => {
      mockPlaceOrder.mockRejectedValue(new Error('Order failed'));
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      let outcome;
      await act(async () => {
        outcome = await result.current.placeOrder({
          analyticsProperties: { marketId: 'market-1' },
          preview: createDefaultParams().preview as OrderPreview,
        });
      });

      expect(outcome).toEqual({
        status: 'error',
        error: 'Order failed',
      });
    });

    it('returns the default error when placeOrder rejects with a non-Error value', async () => {
      mockPlaceOrder.mockRejectedValue('unexpected failure');
      const { result } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      let outcome;
      await act(async () => {
        outcome = await result.current.placeOrder({
          analyticsProperties: { marketId: 'market-1' },
          preview: createDefaultParams().preview as OrderPreview,
        });
      });

      expect(outcome).toEqual({
        status: 'error',
        error: PREDICT_ERROR_CODES.PLACE_ORDER_FAILED,
      });
    });
  });

  describe('confirming state effect', () => {
    it.each([ActiveOrderState.DEPOSITING, ActiveOrderState.PLACING_ORDER])(
      'sets isConfirming to true in %s state',
      (state) => {
        mockActiveOrder = { state };

        renderHook(() => usePredictBuyActions(createDefaultParams()));

        expect(mockSetIsConfirming).toHaveBeenCalledWith(true);
      },
    );

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
    it('shows toast, cleans up and closes the screen in SUCCESS state', async () => {
      mockActiveOrder = { state: ActiveOrderState.SUCCESS };

      renderHook(() => usePredictBuyActions(createDefaultParams()));

      expect(mockInvalidateOrderQueries).toHaveBeenCalledTimes(1);
      expect(mockShowOrderPlacedToast).toHaveBeenCalledTimes(1);
      expect(mockOnPlaceOrderEnd).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(StackActions.pop());
    });
  });
});
