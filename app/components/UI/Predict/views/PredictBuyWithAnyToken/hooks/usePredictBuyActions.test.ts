import { act, renderHook, waitFor } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import { usePredictBuyActions } from './usePredictBuyActions';
import {
  ActiveOrderState,
  OrderPreview,
  PlaceOrderParams,
  Side,
} from '../../../types';

const mockDispatch = jest.fn();
const mockOnApprovalReject = jest.fn();
const mockOnApprovalConfirm = jest.fn();
const mockUnsubscribe = jest.fn();
const mockInvalidateQueries = jest.fn();
const mockShowOrderPlacedToast = jest.fn();
const mockTrackPredictOrderEvent = jest.fn();
const mockPlaceOrder = jest.fn<Promise<unknown>, [PlaceOrderParams]>();
const mockOnPlaceOrderEnd = jest.fn();
const mockOnOrderCancelled = jest.fn();
const mockInitiPayWithAnyToken = jest.fn();
const mockSetIsConfirming = jest.fn();
const mockTransitionEndUnsubscribe = jest.fn();
const mockBeforeRemoveUnsubscribe = jest.fn();
const mockInvalidateOrderQueries = jest.fn();

let mockActiveOrder: {
  batchId?: string | null;
  state?: ActiveOrderState;
} | null = null;
let mockPayWithAnyTokenEnabled = true;

const createAddListenerMock =
  () =>
  (event: string, callback: (e?: { data: { closing: boolean } }) => void) => {
    if (event === 'transitionEnd') {
      callback({ data: { closing: false } });
      return mockTransitionEndUnsubscribe;
    }

    if (event === 'beforeRemove') {
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
      onReject: mockOnApprovalReject,
    }),
  }),
);

jest.mock('../../../hooks/usePredictActiveOrder', () => ({
  usePredictActiveOrder: () => ({
    activeOrder: mockActiveOrder,
  }),
}));

jest.mock('../../../hooks/usePredictTrading', () => ({
  usePredictTrading: () => ({
    placeOrder: mockPlaceOrder,
    initiPayWithAnyToken: mockInitiPayWithAnyToken,
  }),
}));

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      onPlaceOrderEnd: (...args: unknown[]) => mockOnPlaceOrderEnd(...args),
      onOrderCancelled: (...args: unknown[]) => mockOnOrderCancelled(...args),
      trackPredictOrderEvent: (...args: unknown[]) =>
        mockTrackPredictOrderEvent(...args),
      initiPayWithAnyToken: (...args: unknown[]) =>
        mockInitiPayWithAnyToken(...args),
    },
  },
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
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
    mockInitiPayWithAnyToken.mockResolvedValue(undefined);
    mockInvalidateOrderQueries.mockReset();
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

    it('calls initiPayWithAnyToken on mount when pay with any token is enabled', () => {
      renderHook(() => usePredictBuyActions(createDefaultParams()));

      expect(mockInitiPayWithAnyToken).toHaveBeenCalledTimes(1);
    });

    it('does not call initiPayWithAnyToken when pay with any token is disabled', () => {
      mockPayWithAnyTokenEnabled = false;

      renderHook(() => usePredictBuyActions(createDefaultParams()));

      expect(mockInitiPayWithAnyToken).not.toHaveBeenCalled();
    });

    it('rejects approval request on unmount when pay with any token is enabled', () => {
      const { unmount } = renderHook(() =>
        usePredictBuyActions(createDefaultParams()),
      );

      unmount();

      expect(mockTransitionEndUnsubscribe).toHaveBeenCalledTimes(1);
      expect(mockBeforeRemoveUnsubscribe).toHaveBeenCalledTimes(1);
      expect(mockOnApprovalReject).toHaveBeenCalledTimes(1);
    });

    it('only calls initiPayWithAnyToken once even if transitionEnd fires again', () => {
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

      expect(mockInitiPayWithAnyToken).toHaveBeenCalledTimes(1);
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
    it('invalidates predict queries, shows toast, and closes the screen in SUCCESS state', async () => {
      mockActiveOrder = { state: ActiveOrderState.SUCCESS };

      renderHook(() => usePredictBuyActions(createDefaultParams()));

      await waitFor(() => {
        expect(mockInvalidateOrderQueries).toHaveBeenCalledTimes(1);
      });

      expect(mockShowOrderPlacedToast).toHaveBeenCalledTimes(1);
      expect(mockOnPlaceOrderEnd).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(StackActions.pop());
    });
  });
});
