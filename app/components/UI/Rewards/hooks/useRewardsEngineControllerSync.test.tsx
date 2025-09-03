import { renderHook } from '@testing-library/react-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { useRewardsEngineControllerSync } from './useRewardsEngineControllerSync';
import { useSeasonStatus, UseSeasonStatusResult } from './useSeasonStatus';
import {
  setSubscriptionId,
  setSeasonStatus,
  resetRewardsState,
} from '../../../../actions/rewards';
import type { SeasonStatusState } from '../../../../core/Engine/controllers/rewards-controller/types';

// Mock dependencies
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('./useSeasonStatus');
jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseSeasonStatus = useSeasonStatus as jest.MockedFunction<
  typeof useSeasonStatus
>;

// Mock dispatch function
const mockDispatch = jest.fn();

// Mock data
const mockSubscriptionId: string = 'sub-12345678';

const mockSeasonStatus: SeasonStatusState = {
  balance: {
    total: 1250,
    refereePortion: 250,
    updatedAt: new Date('2024-03-15').getTime(),
  },
  tier: {
    currentTier: { id: 'tier-2', name: 'Silver', pointsNeeded: 10 },
    nextTier: { id: 'tier-3', name: 'Gold', pointsNeeded: 15 },
    nextTierPointsNeeded: 5,
  },
};

const mockCurrentSeasonStatusResult: UseSeasonStatusResult = {
  seasonStatus: mockSeasonStatus as SeasonStatusState,
  isLoading: false,
  error: null,
  refresh: jest.fn(),
  isRefreshing: false,
};

describe('useRewardsEngineControllerSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
  });

  describe('Subscription synchronization', () => {
    it('dispatches setSubscriptionId when subscription is available', () => {
      // Arrange
      mockUseSelector.mockReturnValue(mockSubscriptionId);
      mockUseSeasonStatus.mockReturnValue({
        ...mockCurrentSeasonStatusResult,
        seasonStatus: null,
      });

      // Act
      renderHook(() => useRewardsEngineControllerSync());

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith(
        setSubscriptionId(mockSubscriptionId),
      );
    });

    it('dispatches resetRewardsState when subscription is null', () => {
      // Arrange
      mockUseSelector.mockReturnValue(null);
      mockUseSeasonStatus.mockReturnValue({
        ...mockCurrentSeasonStatusResult,
        seasonStatus: null,
      });

      // Act
      renderHook(() => useRewardsEngineControllerSync());

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith(resetRewardsState());
    });

    it('dispatches resetRewardsState when subscription is undefined', () => {
      // Arrange
      mockUseSelector.mockReturnValue(undefined);
      mockUseSeasonStatus.mockReturnValue({
        ...mockCurrentSeasonStatusResult,
        seasonStatus: null,
      });

      // Act
      renderHook(() => useRewardsEngineControllerSync());

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith(resetRewardsState());
    });

    it('updates subscription when subscription changes', () => {
      // Arrange
      const newSubscriptionId: string = 'sub-87654321';

      mockUseSeasonStatus.mockReturnValue({
        ...mockCurrentSeasonStatusResult,
        seasonStatus: null,
      });

      // Act - initial render with first subscription
      mockUseSelector.mockReturnValue(mockSubscriptionId);
      const { rerender } = renderHook(() => useRewardsEngineControllerSync());

      // Clear dispatch calls from initial render
      mockDispatch.mockClear();

      // Act - rerender with new subscription
      mockUseSelector.mockReturnValue(newSubscriptionId);
      rerender();

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith(
        setSubscriptionId(newSubscriptionId),
      );
    });
  });

  describe('Season status synchronization', () => {
    beforeEach(() => {
      mockUseSelector.mockReturnValue(mockSubscriptionId);
    });

    it('dispatches setSeasonStatus when season status is available', () => {
      // Arrange
      mockUseSeasonStatus.mockReturnValue(mockCurrentSeasonStatusResult);

      // Act
      renderHook(() => useRewardsEngineControllerSync());

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith(
        setSeasonStatus(mockSeasonStatus),
      );
    });

    it('dispatches setSeasonStatus(null) when season status is null and not loading/erroring', () => {
      // Arrange
      mockUseSeasonStatus.mockReturnValue({
        ...mockCurrentSeasonStatusResult,
        seasonStatus: null,
        isLoading: false,
        error: null,
      });

      // Act
      renderHook(() => useRewardsEngineControllerSync());

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatus(null));
    });

    it('updates season status when it changes', () => {
      // Arrange
      const updatedSeasonStatus: SeasonStatusState = {
        ...mockSeasonStatus,
        balance: {
          ...mockSeasonStatus.balance,
          total: 2000,
          refereePortion: 500,
        },
      };

      // Act - initial render
      mockUseSeasonStatus.mockReturnValue(mockCurrentSeasonStatusResult);
      const { rerender } = renderHook(() => useRewardsEngineControllerSync());

      // Clear dispatch calls from initial render
      mockDispatch.mockClear();

      // Act - rerender with updated season status
      mockUseSeasonStatus.mockReturnValue({
        ...mockCurrentSeasonStatusResult,
        seasonStatus: updatedSeasonStatus,
      });
      rerender();

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith(
        setSeasonStatus(updatedSeasonStatus),
      );
    });
  });

  describe('Return values', () => {
    it('returns correct values from useCurrentSeasonStatus', () => {
      // Arrange
      mockUseSelector.mockReturnValue(mockSubscriptionId);
      mockUseSeasonStatus.mockReturnValue(mockCurrentSeasonStatusResult);

      // Act
      const { result } = renderHook(() => useRewardsEngineControllerSync());

      // Assert
      expect(result.current).toEqual({
        isLoading: false,
        subscriptionId: mockSubscriptionId,
        seasonStatus: mockSeasonStatus,
      });
    });

    it('returns updated values when dependencies change', () => {
      // Arrange
      mockUseSelector.mockReturnValue(mockSubscriptionId);
      mockUseSeasonStatus.mockReturnValue(mockCurrentSeasonStatusResult);

      const { result, rerender } = renderHook(() =>
        useRewardsEngineControllerSync(),
      );

      // Act - update with error state
      mockUseSeasonStatus.mockReturnValue({
        ...mockCurrentSeasonStatusResult,
        isLoading: true,
        error: 'Network error',
        seasonStatus: null,
      });
      rerender();

      // Assert
      expect(result.current).toEqual({
        isLoading: true,
        subscriptionId: mockSubscriptionId,
        seasonStatus: null,
      });
    });
  });

  describe('Integration scenarios', () => {
    it('handles complete flow with subscription and season status correctly', () => {
      // Arrange - user with subscription and season status
      mockUseSelector.mockReturnValue(mockSubscriptionId);
      mockUseSeasonStatus.mockReturnValue(mockCurrentSeasonStatusResult);

      // Act
      const { result } = renderHook(() => useRewardsEngineControllerSync());

      // Assert - all sync actions should be dispatched
      expect(mockDispatch).toHaveBeenCalledWith(
        setSubscriptionId(mockSubscriptionId),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        setSeasonStatus(mockSeasonStatus),
      );

      // Return values should be correct
      expect(result.current.subscriptionId).toBe(mockSubscriptionId);
      expect(result.current.seasonStatus).toBe(mockSeasonStatus);
    });

    it('handles flow without subscription correctly', () => {
      // Arrange - no subscription available
      mockUseSelector.mockReturnValue(null);
      mockUseSeasonStatus.mockReturnValue({
        ...mockCurrentSeasonStatusResult,
        seasonStatus: null,
      });

      // Act
      const { result } = renderHook(() => useRewardsEngineControllerSync());

      // Assert - should reset state
      expect(mockDispatch).toHaveBeenCalledWith(resetRewardsState());

      // Return values should be correct
      expect(result.current.subscriptionId).toBeNull();
      expect(result.current.seasonStatus).toBeNull();
    });
  });

  describe('Effect dependencies', () => {
    it('subscription effect triggers when subscription changes', () => {
      // Arrange
      mockUseSeasonStatus.mockReturnValue({
        ...mockCurrentSeasonStatusResult,
        seasonStatus: null,
      });

      mockUseSelector
        .mockReturnValueOnce(mockSubscriptionId)
        .mockReturnValueOnce(null);

      // Act
      const { rerender } = renderHook(() => useRewardsEngineControllerSync());
      rerender();

      // Assert - should be called for both subscription values
      expect(mockDispatch).toHaveBeenCalledWith(
        setSubscriptionId(mockSubscriptionId),
      );
      expect(mockDispatch).toHaveBeenCalledWith(resetRewardsState());
    });

    it('season status effect triggers when status/loading/error changes', () => {
      // Arrange
      mockUseSelector.mockReturnValue(mockSubscriptionId);

      // Initial state - loading
      mockUseSeasonStatus.mockReturnValue({
        ...mockCurrentSeasonStatusResult,
        isLoading: true,
        seasonStatus: null,
      });

      const { rerender } = renderHook(() => useRewardsEngineControllerSync());
      mockDispatch.mockClear();

      // Act - change to loaded with data
      mockUseSeasonStatus.mockReturnValue({
        ...mockCurrentSeasonStatusResult,
        isLoading: false,
        seasonStatus: mockSeasonStatus,
      });
      rerender();

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith(
        setSeasonStatus(mockSeasonStatus),
      );
    });
  });
});
