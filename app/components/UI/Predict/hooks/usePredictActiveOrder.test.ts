import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { usePredictActiveOrder } from './usePredictActiveOrder';
import { ActiveOrderState } from '../types';
import { PredictTradeStatus } from '../constants/eventNames';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      setActiveOrder: jest.fn(),
      clearActiveOrder: jest.fn(),
      setSelectedPaymentToken: jest.fn(),
      trackPredictOrderEvent: jest.fn(),
    },
  },
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../utils/analytics', () => ({
  parseAnalyticsProperties: jest.fn(() => ({ marketId: 'market-1' })),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('usePredictActiveOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(undefined);
  });

  describe('updateActiveOrder', () => {
    it('sets full order when state property is present', () => {
      const { result } = renderHook(() => usePredictActiveOrder());

      act(() => {
        result.current.updateActiveOrder({ state: ActiveOrderState.PREVIEW });
      });

      expect(
        Engine.context.PredictController.setActiveOrder,
      ).toHaveBeenCalledWith({ state: ActiveOrderState.PREVIEW });
    });

    it('clears activeOrder when called with null', () => {
      const { result } = renderHook(() => usePredictActiveOrder());

      act(() => {
        result.current.updateActiveOrder(null);
      });

      expect(
        Engine.context.PredictController.clearActiveOrder,
      ).toHaveBeenCalled();
    });

    it('calls clearActiveOrder and setSelectedPaymentToken(null) when null', () => {
      const { result } = renderHook(() => usePredictActiveOrder());

      act(() => {
        result.current.updateActiveOrder(null);
      });

      expect(
        Engine.context.PredictController.clearActiveOrder,
      ).toHaveBeenCalled();
      expect(
        Engine.context.PredictController.setSelectedPaymentToken,
      ).toHaveBeenCalledWith(null);
    });

    it('deletes amount property when amount is null in patch', () => {
      mockUseSelector.mockReturnValue({
        state: ActiveOrderState.PREVIEW,
        amount: '100',
      });

      const { result } = renderHook(() => usePredictActiveOrder());

      act(() => {
        result.current.updateActiveOrder({ amount: null });
      });

      const callArg = (
        Engine.context.PredictController.setActiveOrder as jest.Mock
      ).mock.calls[0][0];
      expect(callArg).not.toHaveProperty('amount');
    });

    it('deletes batchId property when batchId is null in patch', () => {
      mockUseSelector.mockReturnValue({
        state: ActiveOrderState.PREVIEW,
        batchId: 'batch-123',
      });

      const { result } = renderHook(() => usePredictActiveOrder());

      act(() => {
        result.current.updateActiveOrder({ batchId: null });
      });

      const callArg = (
        Engine.context.PredictController.setActiveOrder as jest.Mock
      ).mock.calls[0][0];
      expect(callArg).not.toHaveProperty('batchId');
    });

    it('deletes isInputFocused when null in patch', () => {
      mockUseSelector.mockReturnValue({
        state: ActiveOrderState.PREVIEW,
        isInputFocused: true,
      });

      const { result } = renderHook(() => usePredictActiveOrder());

      act(() => {
        result.current.updateActiveOrder({ isInputFocused: null });
      });

      const callArg = (
        Engine.context.PredictController.setActiveOrder as jest.Mock
      ).mock.calls[0][0];
      expect(callArg).not.toHaveProperty('isInputFocused');
    });

    it('deletes state when null in patch', () => {
      mockUseSelector.mockReturnValue({
        state: ActiveOrderState.PREVIEW,
      });

      const { result } = renderHook(() => usePredictActiveOrder());

      act(() => {
        result.current.updateActiveOrder({ state: null });
      });

      expect(
        Engine.context.PredictController.setActiveOrder,
      ).toHaveBeenCalledWith(null);
    });

    it('deletes error when null in patch', () => {
      mockUseSelector.mockReturnValue({
        state: ActiveOrderState.PREVIEW,
        error: 'some error',
      });

      const { result } = renderHook(() => usePredictActiveOrder());

      act(() => {
        result.current.updateActiveOrder({ error: null });
      });

      const callArg = (
        Engine.context.PredictController.setActiveOrder as jest.Mock
      ).mock.calls[0][0];
      expect(callArg).not.toHaveProperty('error');
    });

    it('merges patch with existing activeOrder state', () => {
      mockUseSelector.mockReturnValue({
        state: ActiveOrderState.PREVIEW,
        isInputFocused: true,
      });

      const { result } = renderHook(() => usePredictActiveOrder());

      act(() => {
        result.current.updateActiveOrder({
          state: ActiveOrderState.PLACING_ORDER,
        });
      });

      expect(
        Engine.context.PredictController.setActiveOrder,
      ).toHaveBeenCalledWith({
        state: ActiveOrderState.PLACING_ORDER,
        isInputFocused: true,
      });
    });

    it('passes null to setActiveOrder when state is removed from nextOrder', () => {
      mockUseSelector.mockReturnValue({
        state: ActiveOrderState.PREVIEW,
        isInputFocused: true,
      });

      const { result } = renderHook(() => usePredictActiveOrder());

      act(() => {
        result.current.updateActiveOrder({ state: null });
      });

      expect(
        Engine.context.PredictController.setActiveOrder,
      ).toHaveBeenCalledWith(null);
    });
  });

  describe('initializeActiveOrder', () => {
    it('sets state to PREVIEW and isInputFocused to true', () => {
      const { result } = renderHook(() => usePredictActiveOrder());

      act(() => {
        result.current.initializeActiveOrder({
          market: {
            id: 'market-1',
            providerId: 'provider-1',
            slug: 'market-slug',
            title: 'Market Title',
            description: 'Market Description',
            image: 'image-url',
            status: 'open',
            recurrence: 'none' as const,
            category: 'trending' as const,
            tags: [],
            outcomes: [],
            liquidity: 1000,
            volume: 5000,
          },
          outcomeToken: { id: 'token-1', title: 'Yes', price: 0.6 },
        });
      });

      expect(
        Engine.context.PredictController.setActiveOrder,
      ).toHaveBeenCalledWith({
        state: ActiveOrderState.PREVIEW,
        isInputFocused: true,
      });
    });

    it('calls setSelectedPaymentToken with null', () => {
      const { result } = renderHook(() => usePredictActiveOrder());

      act(() => {
        result.current.initializeActiveOrder({
          market: {
            id: 'market-1',
            providerId: 'provider-1',
            slug: 'market-slug',
            title: 'Market Title',
            description: 'Market Description',
            image: 'image-url',
            status: 'open',
            recurrence: 'none' as const,
            category: 'trending' as const,
            tags: [],
            outcomes: [],
            liquidity: 1000,
            volume: 5000,
          },
          outcomeToken: { id: 'token-1', title: 'Yes', price: 0.6 },
        });
      });

      expect(
        Engine.context.PredictController.setSelectedPaymentToken,
      ).toHaveBeenCalledWith(null);
    });

    it('calls trackPredictOrderEvent with INITIATED status', () => {
      const { result } = renderHook(() => usePredictActiveOrder());

      act(() => {
        result.current.initializeActiveOrder({
          market: {
            id: 'market-1',
            providerId: 'provider-1',
            slug: 'market-slug',
            title: 'Market Title',
            description: 'Market Description',
            image: 'image-url',
            status: 'open',
            recurrence: 'none' as const,
            category: 'trending' as const,
            tags: [],
            outcomes: [],
            liquidity: 1000,
            volume: 5000,
          },
          outcomeToken: { id: 'token-1', title: 'Yes', price: 0.6 },
        });
      });

      expect(
        Engine.context.PredictController.trackPredictOrderEvent,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ status: PredictTradeStatus.INITIATED }),
      );
    });

    it('passes parsed analytics properties from market/outcomeToken/entryPoint', () => {
      const { parseAnalyticsProperties } = jest.requireMock(
        '../utils/analytics',
      ) as { parseAnalyticsProperties: jest.Mock };

      const mockMarket = {
        id: 'market-1',
        providerId: 'provider-1',
        slug: 'market-slug',
        title: 'Market Title',
        description: 'Market Description',
        image: 'image-url',
        status: 'open' as const,
        recurrence: 'none' as const,
        category: 'trending' as const,
        tags: [],
        outcomes: [],
        liquidity: 1000,
        volume: 5000,
      };
      const mockOutcomeToken = { id: 'token-1', title: 'Yes', price: 0.6 };
      const mockEntryPoint = 'carousel' as const;

      const { result } = renderHook(() => usePredictActiveOrder());

      act(() => {
        result.current.initializeActiveOrder({
          market: mockMarket,
          outcomeToken: mockOutcomeToken,
          entryPoint: mockEntryPoint,
        });
      });

      expect(parseAnalyticsProperties).toHaveBeenCalledWith(
        mockMarket,
        mockOutcomeToken,
        mockEntryPoint,
      );
      expect(
        Engine.context.PredictController.trackPredictOrderEvent,
      ).toHaveBeenCalledWith({
        status: PredictTradeStatus.INITIATED,
        analyticsProperties: { marketId: 'market-1' },
      });
    });
  });

  describe('clearActiveOrder', () => {
    it('calls PredictController.clearActiveOrder', () => {
      const { result } = renderHook(() => usePredictActiveOrder());

      act(() => {
        result.current.clearActiveOrder();
      });

      expect(
        Engine.context.PredictController.clearActiveOrder,
      ).toHaveBeenCalled();
    });
  });

  describe('return values', () => {
    it('returns activeOrder from useSelector', () => {
      const mockActiveOrder = {
        state: ActiveOrderState.PREVIEW,
        isInputFocused: true,
      };
      mockUseSelector.mockReturnValue(mockActiveOrder);

      const { result } = renderHook(() => usePredictActiveOrder());

      expect(result.current.activeOrder).toEqual(mockActiveOrder);
    });
  });
});
