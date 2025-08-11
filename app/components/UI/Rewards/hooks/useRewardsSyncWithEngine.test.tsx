import { renderHook } from '@testing-library/react-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { useRewardsSyncWithEngine } from './useRewardsSyncWithEngine';
import {
  useCurrentSeasonStatus,
  UseCurrentSeasonStatusResult,
} from './useCurrentSeasonStatus';
import {
  setSubscription,
  setSeasonStatus,
  resetRewardsState,
} from '../../../../actions/rewards';
import type {
  SubscriptionDto,
  SeasonStatusDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';

// Mock dependencies
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('./useCurrentSeasonStatus');
jest.mock('../../../../selectors/rewardscontroller', () => ({
  selectRewardsSubscription: jest.fn(),
}));

const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseCurrentSeasonStatus =
  useCurrentSeasonStatus as jest.MockedFunction<typeof useCurrentSeasonStatus>;

// Mock dispatch function
const mockDispatch = jest.fn();

// Mock data
const mockSubscription: SubscriptionDto = {
  id: 'sub-12345678',
  referralCode: 'METAMASK123',
  accounts: [{ address: '0x12345678901234567890123456789012', chainId: 1 }],
};

const mockSeasonStatus: SeasonStatusDto = {
  season: {
    id: 'season-1',
    name: 'Season 1 - Early Adopters',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-06-30'),
    tiers: [
      {
        id: 'tier-1',
        type: 'Bronze',
        pointsNeeded: 1000,
        seasonId: 'season-1',
      },
      {
        id: 'tier-2',
        type: 'Silver',
        pointsNeeded: 2000,
        seasonId: 'season-1',
      },
      { id: 'tier-3', type: 'Gold', pointsNeeded: 3000, seasonId: 'season-1' },
    ],
  },
  balance: {
    total: 1250,
    refereePortion: 250,
    updatedAt: new Date('2024-03-15'),
  },
  currentTierId: 'tier-2',
};

const mockCurrentSeasonStatusResult: UseCurrentSeasonStatusResult = {
  seasonStatus: mockSeasonStatus,
  isLoading: false,
  error: null,
  refresh: jest.fn(),
  isRefreshing: false,
};

describe('useRewardsSyncWithEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
  });

  describe('Subscription synchronization', () => {
    it('dispatches setSubscription when subscription is available', () => {
      // Arrange
      mockUseSelector.mockReturnValue(mockSubscription);
      mockUseCurrentSeasonStatus.mockReturnValue({
        ...mockCurrentSeasonStatusResult,
        seasonStatus: null,
      });

      // Act
      renderHook(() => useRewardsSyncWithEngine());

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith(
        setSubscription(mockSubscription),
      );
    });

    it('dispatches resetRewardsState when subscription is null', () => {
      // Arrange
      mockUseSelector.mockReturnValue(null);
      mockUseCurrentSeasonStatus.mockReturnValue({
        ...mockCurrentSeasonStatusResult,
        seasonStatus: null,
      });

      // Act
      renderHook(() => useRewardsSyncWithEngine());

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith(resetRewardsState());
    });

    it('dispatches resetRewardsState when subscription is undefined', () => {
      // Arrange
      mockUseSelector.mockReturnValue(undefined);
      mockUseCurrentSeasonStatus.mockReturnValue({
        ...mockCurrentSeasonStatusResult,
        seasonStatus: null,
      });

      // Act
      renderHook(() => useRewardsSyncWithEngine());

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith(resetRewardsState());
    });

    it('updates subscription when subscription changes', () => {
      // Arrange
      const newSubscription: SubscriptionDto = {
        id: 'sub-87654321',
        referralCode: 'METAMASK456',
        accounts: [
          { address: '0x12345678901234567890123456789012', chainId: 1 },
        ],
      };

      mockUseCurrentSeasonStatus.mockReturnValue({
        ...mockCurrentSeasonStatusResult,
        seasonStatus: null,
      });

      // Act - initial render with first subscription
      mockUseSelector.mockReturnValue(mockSubscription);
      const { rerender } = renderHook(() => useRewardsSyncWithEngine());

      // Clear dispatch calls from initial render
      mockDispatch.mockClear();

      // Act - rerender with new subscription
      mockUseSelector.mockReturnValue(newSubscription);
      rerender();

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith(
        setSubscription(newSubscription),
      );
    });
  });

  describe('Season status synchronization', () => {
    beforeEach(() => {
      mockUseSelector.mockReturnValue(mockSubscription);
    });

    it('dispatches setSeasonStatus when season status is available', () => {
      // Arrange
      mockUseCurrentSeasonStatus.mockReturnValue(mockCurrentSeasonStatusResult);

      // Act
      renderHook(() => useRewardsSyncWithEngine());

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith(
        setSeasonStatus(mockSeasonStatus),
      );
    });

    it('dispatches setSeasonStatus(null) when season status is null and not loading/erroring', () => {
      // Arrange
      mockUseCurrentSeasonStatus.mockReturnValue({
        ...mockCurrentSeasonStatusResult,
        seasonStatus: null,
        isLoading: false,
        error: null,
      });

      // Act
      renderHook(() => useRewardsSyncWithEngine());

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatus(null));
    });

    it('updates season status when it changes', () => {
      // Arrange
      const updatedSeasonStatus: SeasonStatusDto = {
        ...mockSeasonStatus,
        balance: {
          ...mockSeasonStatus.balance,
          total: 2000,
          refereePortion: 500,
        },
      };

      // Act - initial render
      mockUseCurrentSeasonStatus.mockReturnValue(mockCurrentSeasonStatusResult);
      const { rerender } = renderHook(() => useRewardsSyncWithEngine());

      // Clear dispatch calls from initial render
      mockDispatch.mockClear();

      // Act - rerender with updated season status
      mockUseCurrentSeasonStatus.mockReturnValue({
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
      mockUseSelector.mockReturnValue(mockSubscription);
      mockUseCurrentSeasonStatus.mockReturnValue(mockCurrentSeasonStatusResult);

      // Act
      const { result } = renderHook(() => useRewardsSyncWithEngine());

      // Assert
      expect(result.current).toEqual({
        isLoading: false,
        subscription: mockSubscription,
        seasonStatus: mockSeasonStatus,
      });
    });

    it('returns updated values when dependencies change', () => {
      // Arrange
      mockUseSelector.mockReturnValue(mockSubscription);
      mockUseCurrentSeasonStatus.mockReturnValue(mockCurrentSeasonStatusResult);

      const { result, rerender } = renderHook(() => useRewardsSyncWithEngine());

      // Act - update with error state
      mockUseCurrentSeasonStatus.mockReturnValue({
        ...mockCurrentSeasonStatusResult,
        isLoading: true,
        error: 'Network error',
        seasonStatus: null,
      });
      rerender();

      // Assert
      expect(result.current).toEqual({
        isLoading: true,
        subscription: mockSubscription,
        seasonStatus: null,
      });
    });
  });

  describe('Integration scenarios', () => {
    it('handles complete flow with subscription and season status correctly', () => {
      // Arrange - user with subscription and season status
      mockUseSelector.mockReturnValue(mockSubscription);
      mockUseCurrentSeasonStatus.mockReturnValue(mockCurrentSeasonStatusResult);

      // Act
      const { result } = renderHook(() => useRewardsSyncWithEngine());

      // Assert - all sync actions should be dispatched
      expect(mockDispatch).toHaveBeenCalledWith(
        setSubscription(mockSubscription),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        setSeasonStatus(mockSeasonStatus),
      );

      // Return values should be correct
      expect(result.current.subscription).toBe(mockSubscription);
      expect(result.current.seasonStatus).toBe(mockSeasonStatus);
    });

    it('handles flow without subscription correctly', () => {
      // Arrange - no subscription available
      mockUseSelector.mockReturnValue(null);
      mockUseCurrentSeasonStatus.mockReturnValue({
        ...mockCurrentSeasonStatusResult,
        seasonStatus: null,
      });

      // Act
      const { result } = renderHook(() => useRewardsSyncWithEngine());

      // Assert - should reset state
      expect(mockDispatch).toHaveBeenCalledWith(resetRewardsState());

      // Return values should be correct
      expect(result.current.subscription).toBeNull();
      expect(result.current.seasonStatus).toBeNull();
    });
  });

  describe('Effect dependencies', () => {
    it('subscription effect triggers when subscription changes', () => {
      // Arrange
      mockUseCurrentSeasonStatus.mockReturnValue({
        ...mockCurrentSeasonStatusResult,
        seasonStatus: null,
      });

      mockUseSelector
        .mockReturnValueOnce(mockSubscription)
        .mockReturnValueOnce(null);

      // Act
      const { rerender } = renderHook(() => useRewardsSyncWithEngine());
      rerender();

      // Assert - should be called for both subscription values
      expect(mockDispatch).toHaveBeenCalledWith(
        setSubscription(mockSubscription),
      );
      expect(mockDispatch).toHaveBeenCalledWith(resetRewardsState());
    });

    it('season status effect triggers when status/loading/error changes', () => {
      // Arrange
      mockUseSelector.mockReturnValue(mockSubscription);

      // Initial state - loading
      mockUseCurrentSeasonStatus.mockReturnValue({
        ...mockCurrentSeasonStatusResult,
        isLoading: true,
        seasonStatus: null,
      });

      const { rerender } = renderHook(() => useRewardsSyncWithEngine());
      mockDispatch.mockClear();

      // Act - change to loaded with data
      mockUseCurrentSeasonStatus.mockReturnValue({
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
