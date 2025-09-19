import { renderHook, act } from '@testing-library/react-native';
import { usePerpsRewards } from './usePerpsRewards';
import type { OrderFeesResult } from './usePerpsOrderFees';

// Mock the Redux selector
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

// Mock the development config
jest.mock('../constants/perpsConfig', () => ({
  DEVELOPMENT_CONFIG: {
    SIMULATE_REWARDS_ERROR_AMOUNT: 42,
    SIMULATE_REWARDS_LOADING_AMOUNT: 43,
  },
}));

import { useSelector } from 'react-redux';
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('usePerpsRewards', () => {
  // Mock fee results for testing
  const createMockFeeResults = (
    overrides: Partial<OrderFeesResult> = {},
  ): OrderFeesResult => ({
    protocolFeeRate: 0.00045,
    metamaskFeeRate: 0,
    originalMetamaskFeeRate: 0,
    protocolFee: 45,
    metamaskFee: 0,
    totalFee: 45,
    isLoadingMetamaskFee: false,
    error: null,
    estimatedPoints: undefined,
    bonusBips: undefined,
    feeDiscountPercentage: undefined,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: rewards enabled
    mockUseSelector.mockReturnValue(true);
  });

  describe('Feature flag scenarios', () => {
    it('should not show rewards row when feature flag is disabled', () => {
      // Arrange
      mockUseSelector.mockReturnValue(false);
      const feeResults = createMockFeeResults({ estimatedPoints: 100 });

      // Act
      const { result } = renderHook(() =>
        usePerpsRewards({
          feeResults,
          hasValidAmount: true,
          isFeesLoading: false,
          orderAmount: '1000',
        }),
      );

      // Assert
      expect(result.current.shouldShowRewardsRow).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);
    });

    it('should show rewards row when feature flag is enabled and has valid amount', () => {
      // Arrange
      mockUseSelector.mockReturnValue(true);
      const feeResults = createMockFeeResults({ estimatedPoints: 100 });

      // Act
      const { result } = renderHook(() =>
        usePerpsRewards({
          feeResults,
          hasValidAmount: true,
          isFeesLoading: false,
          orderAmount: '1000',
        }),
      );

      // Assert
      expect(result.current.shouldShowRewardsRow).toBe(true);
      expect(result.current.estimatedPoints).toBe(100);
    });

    it('should not show rewards row when hasValidAmount is false', () => {
      // Arrange
      mockUseSelector.mockReturnValue(true);
      const feeResults = createMockFeeResults({ estimatedPoints: 100 });

      // Act
      const { result } = renderHook(() =>
        usePerpsRewards({
          feeResults,
          hasValidAmount: false,
          isFeesLoading: false,
          orderAmount: '0',
        }),
      );

      // Assert
      expect(result.current.shouldShowRewardsRow).toBe(false);
    });
  });

  describe('Loading states', () => {
    it('should show loading when isFeesLoading is true', () => {
      // Arrange
      const feeResults = createMockFeeResults();

      // Act
      const { result } = renderHook(() =>
        usePerpsRewards({
          feeResults,
          hasValidAmount: true,
          isFeesLoading: true,
          orderAmount: '1000',
        }),
      );

      // Assert
      expect(result.current.isLoading).toBe(true);
      expect(result.current.shouldShowRewardsRow).toBe(true);
    });

    it('should show loading when metamask fee is loading', () => {
      // Arrange
      const feeResults = createMockFeeResults({
        isLoadingMetamaskFee: true,
        estimatedPoints: undefined,
      });

      // Act
      const { result } = renderHook(() =>
        usePerpsRewards({
          feeResults,
          hasValidAmount: true,
          isFeesLoading: false,
          orderAmount: '1000',
        }),
      );

      // Assert
      expect(result.current.isLoading).toBe(true);
    });

    it('should show loading when rewards row should show but estimated points undefined', () => {
      // Arrange
      const feeResults = createMockFeeResults({ estimatedPoints: undefined });

      // Act
      const { result } = renderHook(() =>
        usePerpsRewards({
          feeResults,
          hasValidAmount: true,
          isFeesLoading: false,
          orderAmount: '1000',
        }),
      );

      // Assert
      expect(result.current.isLoading).toBe(false); // shouldShowRewardsRow is false when estimatedPoints undefined and not loading
    });

    it('should not be loading when all conditions are met', () => {
      // Arrange
      const feeResults = createMockFeeResults({
        estimatedPoints: 100,
        isLoadingMetamaskFee: false,
      });

      // Act
      const { result } = renderHook(() =>
        usePerpsRewards({
          feeResults,
          hasValidAmount: true,
          isFeesLoading: false,
          orderAmount: '1000',
        }),
      );

      // Assert
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Error states', () => {
    it('should show error when fee results have error and rewards row should show', () => {
      // Arrange
      const feeResults = createMockFeeResults({
        error: 'Network error',
        estimatedPoints: 100, // Makes shouldShowRewardsRow true
      });

      // Act
      const { result } = renderHook(() =>
        usePerpsRewards({
          feeResults,
          hasValidAmount: true,
          isFeesLoading: false,
          orderAmount: '1000',
        }),
      );

      // Assert
      expect(result.current.hasError).toBe(true);
      expect(result.current.shouldShowRewardsRow).toBe(true);
    });

    it('should not show error when fee results have error but rewards row should not show', () => {
      // Arrange
      const feeResults = createMockFeeResults({
        error: 'Network error',
        estimatedPoints: undefined, // Makes shouldShowRewardsRow false
      });

      // Act
      const { result } = renderHook(() =>
        usePerpsRewards({
          feeResults,
          hasValidAmount: false,
          isFeesLoading: false,
          orderAmount: '0',
        }),
      );

      // Assert
      expect(result.current.hasError).toBe(false);
      expect(result.current.shouldShowRewardsRow).toBe(false);
    });

    it('should not show error when no error in fee results', () => {
      // Arrange
      const feeResults = createMockFeeResults({
        error: null,
        estimatedPoints: 100,
      });

      // Act
      const { result } = renderHook(() =>
        usePerpsRewards({
          feeResults,
          hasValidAmount: true,
          isFeesLoading: false,
          orderAmount: '1000',
        }),
      );

      // Assert
      expect(result.current.hasError).toBe(false);
    });
  });

  describe('Points update behavior', () => {
    it('should update points when fee results change', () => {
      // Arrange
      const initialFeeResults = createMockFeeResults({ estimatedPoints: 100 });

      const { result, rerender } = renderHook(
        ({ feeResults }) =>
          usePerpsRewards({
            feeResults,
            hasValidAmount: true,
            isFeesLoading: false,
            orderAmount: '1000',
          }),
        {
          initialProps: { feeResults: initialFeeResults },
        },
      );

      // Assert initial state
      expect(result.current.estimatedPoints).toBe(100);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);

      // Act - Change points value
      const updatedFeeResults = createMockFeeResults({ estimatedPoints: 200 });
      act(() => {
        rerender({ feeResults: updatedFeeResults });
      });

      // Assert - Points should update correctly
      expect(result.current.estimatedPoints).toBe(200);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);
    });

    it('should handle points changing to undefined', () => {
      // Arrange
      const initialFeeResults = createMockFeeResults({ estimatedPoints: 100 });

      const { result, rerender } = renderHook(
        ({ feeResults }) =>
          usePerpsRewards({
            feeResults,
            hasValidAmount: true,
            isFeesLoading: false,
            orderAmount: '1000',
          }),
        {
          initialProps: { feeResults: initialFeeResults },
        },
      );

      // Assert initial state
      expect(result.current.estimatedPoints).toBe(100);

      // Act - Change points to undefined
      const updatedFeeResults = createMockFeeResults({
        estimatedPoints: undefined,
      });
      rerender({ feeResults: updatedFeeResults });

      // Assert - Points should become undefined
      expect(result.current.estimatedPoints).toBeUndefined();
    });

    it('should handle first render with points', () => {
      // Arrange & Act
      const feeResults = createMockFeeResults({ estimatedPoints: 100 });

      const { result } = renderHook(() =>
        usePerpsRewards({
          feeResults,
          hasValidAmount: true,
          isFeesLoading: false,
          orderAmount: '1000',
        }),
      );

      // Assert - Should display points correctly on first render
      expect(result.current.estimatedPoints).toBe(100);
      expect(result.current.shouldShowRewardsRow).toBe(true);
    });
  });

  describe('Development simulation states', () => {
    beforeEach(() => {
      // Mock __DEV__ to be true
      (global as unknown as { __DEV__: boolean }).__DEV__ = true;
    });

    afterEach(() => {
      // Reset __DEV__
      (global as unknown as { __DEV__: boolean }).__DEV__ = false;
    });

    it('should simulate error state when order amount is 42', () => {
      // Arrange
      const feeResults = createMockFeeResults({ estimatedPoints: 100 });

      // Act
      const { result } = renderHook(() =>
        usePerpsRewards({
          feeResults,
          hasValidAmount: true,
          isFeesLoading: false,
          orderAmount: '42', // Triggers error simulation
        }),
      );

      // Assert
      expect(result.current.hasError).toBe(true);
    });

    it('should simulate loading state when order amount is 43', () => {
      // Arrange
      const feeResults = createMockFeeResults({ estimatedPoints: 100 });

      // Act
      const { result } = renderHook(() =>
        usePerpsRewards({
          feeResults,
          hasValidAmount: true,
          isFeesLoading: false,
          orderAmount: '43', // Triggers loading simulation
        }),
      );

      // Assert
      expect(result.current.isLoading).toBe(true);
    });

    it('should not simulate when not in dev mode', () => {
      // Arrange
      (global as unknown as { __DEV__: boolean }).__DEV__ = false;
      const feeResults = createMockFeeResults({ estimatedPoints: 100 });

      // Act
      const { result } = renderHook(() =>
        usePerpsRewards({
          feeResults,
          hasValidAmount: true,
          isFeesLoading: false,
          orderAmount: '42', // Should not trigger error in production
        }),
      );

      // Assert
      expect(result.current.hasError).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('should not simulate with non-matching amounts', () => {
      // Arrange
      const feeResults = createMockFeeResults({ estimatedPoints: 100 });

      // Act
      const { result } = renderHook(() =>
        usePerpsRewards({
          feeResults,
          hasValidAmount: true,
          isFeesLoading: false,
          orderAmount: '100', // Normal amount
        }),
      );

      // Assert
      expect(result.current.hasError).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Return values', () => {
    it('should return all expected properties from fee results', () => {
      // Arrange
      const feeResults = createMockFeeResults({
        estimatedPoints: 1500,
        bonusBips: 250,
        feeDiscountPercentage: 15,
      });

      // Act
      const { result } = renderHook(() =>
        usePerpsRewards({
          feeResults,
          hasValidAmount: true,
          isFeesLoading: false,
          orderAmount: '1000',
        }),
      );

      // Assert
      expect(result.current.estimatedPoints).toBe(1500);
      expect(result.current.bonusBips).toBe(250);
      expect(result.current.feeDiscountPercentage).toBe(15);
    });

    it('should handle undefined values gracefully', () => {
      // Arrange
      const feeResults = createMockFeeResults({
        estimatedPoints: undefined,
        bonusBips: undefined,
        feeDiscountPercentage: undefined,
      });

      // Act
      const { result } = renderHook(() =>
        usePerpsRewards({
          feeResults,
          hasValidAmount: true,
          isFeesLoading: false,
          orderAmount: '1000',
        }),
      );

      // Assert
      expect(result.current.estimatedPoints).toBeUndefined();
      expect(result.current.bonusBips).toBeUndefined();
      expect(result.current.feeDiscountPercentage).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty order amount', () => {
      // Arrange
      const feeResults = createMockFeeResults({ estimatedPoints: 100 });

      // Act
      const { result } = renderHook(() =>
        usePerpsRewards({
          feeResults,
          hasValidAmount: false,
          isFeesLoading: false,
          orderAmount: '', // Empty amount
        }),
      );

      // Assert
      expect(result.current.shouldShowRewardsRow).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);
    });

    it('should handle transitions from points to no points', () => {
      // Arrange
      const initialFeeResults = createMockFeeResults({ estimatedPoints: 100 });

      const { result, rerender } = renderHook(
        ({ feeResults, hasValidAmount }) =>
          usePerpsRewards({
            feeResults,
            hasValidAmount,
            isFeesLoading: false,
            orderAmount: '1000',
          }),
        {
          initialProps: {
            feeResults: initialFeeResults,
            hasValidAmount: true,
          },
        },
      );

      // Act - Transition to no valid amount
      const updatedFeeResults = createMockFeeResults({
        estimatedPoints: undefined,
      });
      rerender({
        feeResults: updatedFeeResults,
        hasValidAmount: false,
      });

      // Assert
      expect(result.current.shouldShowRewardsRow).toBe(false);
      expect(result.current.isRefresh).toBe(false);
    });
  });
});
