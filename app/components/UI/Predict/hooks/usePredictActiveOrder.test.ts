import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { usePredictActiveOrder } from './usePredictActiveOrder';
import { ActiveOrderState, Recurrence } from '../types';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      clearActiveOrder: jest.fn(),
      clearOrderError: jest.fn(),
      initializeOrder: jest.fn(),
      setOrderAmount: jest.fn(),
      setOrderInputFocused: jest.fn(),
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

  describe('initializeActiveOrder', () => {
    it('delegates to PredictController.initializeOrder with parsed analytics', () => {
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
            recurrence: Recurrence.NONE,
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
        Engine.context.PredictController.initializeOrder,
      ).toHaveBeenCalledWith({ marketId: 'market-1' });
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
        recurrence: Recurrence.NONE,
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
        Engine.context.PredictController.initializeOrder,
      ).toHaveBeenCalledWith({ marketId: 'market-1' });
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

  describe('setOrderAmount', () => {
    it('delegates to PredictController.setOrderAmount', () => {
      const { result } = renderHook(() => usePredictActiveOrder());

      act(() => {
        result.current.setOrderAmount(50);
      });

      expect(
        Engine.context.PredictController.setOrderAmount,
      ).toHaveBeenCalledWith(50);
    });
  });

  describe('clearOrderError', () => {
    it('delegates to PredictController.clearOrderError', () => {
      const { result } = renderHook(() => usePredictActiveOrder());

      act(() => {
        result.current.clearOrderError();
      });

      expect(
        Engine.context.PredictController.clearOrderError,
      ).toHaveBeenCalled();
    });
  });

  describe('setOrderInputFocused', () => {
    it('delegates to PredictController.setOrderInputFocused', () => {
      const { result } = renderHook(() => usePredictActiveOrder());

      act(() => {
        result.current.setOrderInputFocused(true);
      });

      expect(
        Engine.context.PredictController.setOrderInputFocused,
      ).toHaveBeenCalledWith(true);
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
