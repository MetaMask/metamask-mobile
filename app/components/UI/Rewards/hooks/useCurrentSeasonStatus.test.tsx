import { renderHook, act } from '@testing-library/react-hooks';
import { useCurrentSeasonStatus } from './useCurrentSeasonStatus';
import { useSeasonStatus } from './useSeasonStatus';
import { useRewardsSubscription } from './useRewardsSubscription';
import type {
  UseSeasonStatusResult,
  UseRewardsSubscriptionResult,
} from './index';
import type { SeasonStatusDto } from '../../../../core/Engine/controllers/rewards-controller/types';

// Mock the dependency hooks
jest.mock('./useSeasonStatus');
jest.mock('./useRewardsSubscription');

const mockUseSeasonStatus = useSeasonStatus as jest.MockedFunction<
  typeof useSeasonStatus
>;
const mockUseRewardsSubscription =
  useRewardsSubscription as jest.MockedFunction<typeof useRewardsSubscription>;

// Mock data
const mockSeasonStatus: SeasonStatusDto = {
  season: {
    id: 'season-1',
    name: 'Season 1 - Early Adopters',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-06-30'),
    tiers: [
      { id: 'tier-1', name: 'Bronze' },
      { id: 'tier-2', name: 'Silver' },
      { id: 'tier-3', name: 'Gold' },
    ],
  },
  balance: {
    total: 1250,
    refereePortion: 250,
    updatedAt: new Date('2024-03-15'),
  },
  currentTierId: 'tier-2',
};

const mockSubscriptionResult: UseRewardsSubscriptionResult = {
  subscription: {
    id: 'sub-12345678',
    referralCode: 'METAMASK123',
  },
  subscriptionId: 'sub-12345678',
  isAuthenticated: true,
  lastAuthenticatedAccount: '0x1234567890abcdef1234567890abcdef12345678',
};

const mockSeasonStatusResult: UseSeasonStatusResult = {
  seasonStatus: mockSeasonStatus,
  isLoading: false,
  isRefreshing: false,
  error: null,
  refresh: jest.fn(),
};

describe('useCurrentSeasonStatus', () => {
  const mockSeasonId = 'season-1';

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default successful mocks
    mockUseRewardsSubscription.mockReturnValue(mockSubscriptionResult);
    mockUseSeasonStatus.mockReturnValue(mockSeasonStatusResult);
  });

  describe('Initial state', () => {
    it('returns combined initial state when authenticated', () => {
      // Act
      const { result } = renderHook(() =>
        useCurrentSeasonStatus({ seasonId: mockSeasonId }),
      );

      // Assert
      expect(result.current.seasonStatus).toEqual(mockSeasonStatus);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.subscriptionId).toBe('sub-12345678');
      expect(result.current.lastAuthenticatedAccount).toBe(
        '0x1234567890abcdef1234567890abcdef12345678',
      );
      expect(typeof result.current.refresh).toBe('function');
    });

    it('passes season ID to useSeasonStatus', () => {
      // Act
      renderHook(() => useCurrentSeasonStatus({ seasonId: mockSeasonId }));

      // Assert
      expect(mockUseSeasonStatus).toHaveBeenCalledWith({
        seasonId: mockSeasonId,
        subscriptionId: mockSubscriptionResult.subscriptionId,
      });
    });

    it('calls useRewardsSubscription without parameters', () => {
      // Act
      renderHook(() => useCurrentSeasonStatus({ seasonId: mockSeasonId }));

      // Assert
      expect(mockUseRewardsSubscription).toHaveBeenCalledWith();
    });
  });

  describe('Unauthenticated state', () => {
    it('returns unauthenticated state when user is not authenticated', () => {
      // Arrange
      const unauthenticatedSubscriptionResult: UseRewardsSubscriptionResult = {
        subscription: null,
        subscriptionId: null,
        isAuthenticated: false,
        lastAuthenticatedAccount: null,
      };

      mockUseRewardsSubscription.mockReturnValue(
        unauthenticatedSubscriptionResult,
      );

      // Act
      const { result } = renderHook(() =>
        useCurrentSeasonStatus({ seasonId: mockSeasonId }),
      );

      // Assert
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.subscriptionId).toBeNull();
      expect(result.current.lastAuthenticatedAccount).toBeNull();
    });

    it('passes undefined subscription ID when not authenticated', () => {
      // Arrange
      const unauthenticatedSubscriptionResult: UseRewardsSubscriptionResult = {
        subscription: null,
        subscriptionId: null,
        isAuthenticated: false,
        lastAuthenticatedAccount: null,
      };

      mockUseRewardsSubscription.mockReturnValue(
        unauthenticatedSubscriptionResult,
      );

      // Act
      renderHook(() => useCurrentSeasonStatus({ seasonId: mockSeasonId }));

      // Assert
      expect(mockUseSeasonStatus).toHaveBeenCalledWith({
        seasonId: mockSeasonId,
        subscriptionId: undefined,
      });
    });
  });

  describe('Season status loading states', () => {
    it('reflects loading state from useSeasonStatus', () => {
      // Arrange
      const loadingSeasonStatusResult: UseSeasonStatusResult = {
        ...mockSeasonStatusResult,
        isLoading: true,
        seasonStatus: null,
      };

      mockUseSeasonStatus.mockReturnValue(loadingSeasonStatusResult);

      // Act
      const { result } = renderHook(() =>
        useCurrentSeasonStatus({ seasonId: mockSeasonId }),
      );

      // Assert
      expect(result.current.isLoading).toBe(true);
      expect(result.current.seasonStatus).toBeNull();
    });

    it('reflects refreshing state from useSeasonStatus', () => {
      // Arrange
      const refreshingSeasonStatusResult: UseSeasonStatusResult = {
        ...mockSeasonStatusResult,
        isRefreshing: true,
      };

      mockUseSeasonStatus.mockReturnValue(refreshingSeasonStatusResult);

      // Act
      const { result } = renderHook(() =>
        useCurrentSeasonStatus({ seasonId: mockSeasonId }),
      );

      // Assert
      expect(result.current.isRefreshing).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('reflects error state from useSeasonStatus', () => {
      // Arrange
      const errorMessage = 'Failed to fetch season status';
      const errorSeasonStatusResult: UseSeasonStatusResult = {
        ...mockSeasonStatusResult,
        error: errorMessage,
        seasonStatus: null,
      };

      mockUseSeasonStatus.mockReturnValue(errorSeasonStatusResult);

      // Act
      const { result } = renderHook(() =>
        useCurrentSeasonStatus({ seasonId: mockSeasonId }),
      );

      // Assert
      expect(result.current.error).toBe(errorMessage);
    });

    it('maintains season status data when error occurs', () => {
      // Arrange
      const errorSeasonStatusResult: UseSeasonStatusResult = {
        ...mockSeasonStatusResult,
        error: 'Network timeout',
        // Keep existing season status data
        seasonStatus: mockSeasonStatus,
      };

      mockUseSeasonStatus.mockReturnValue(errorSeasonStatusResult);

      // Act
      const { result } = renderHook(() =>
        useCurrentSeasonStatus({ seasonId: mockSeasonId }),
      );

      // Assert
      expect(result.current.error).toBe('Network timeout');
      expect(result.current.seasonStatus).toEqual(mockSeasonStatus);
    });
  });

  describe('Refresh functionality', () => {
    it('calls refresh function from useSeasonStatus', async () => {
      // Arrange
      const mockRefresh = jest.fn().mockResolvedValue(undefined);
      const seasonStatusWithRefresh: UseSeasonStatusResult = {
        ...mockSeasonStatusResult,
        refresh: mockRefresh,
      };

      mockUseSeasonStatus.mockReturnValue(seasonStatusWithRefresh);

      // Act
      const { result } = renderHook(() =>
        useCurrentSeasonStatus({ seasonId: mockSeasonId }),
      );

      await act(async () => {
        await result.current.refresh();
      });

      // Assert
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('returns the same refresh function reference', () => {
      // Arrange
      const mockRefresh = jest.fn();
      const seasonStatusWithRefresh: UseSeasonStatusResult = {
        ...mockSeasonStatusResult,
        refresh: mockRefresh,
      };

      mockUseSeasonStatus.mockReturnValue(seasonStatusWithRefresh);

      // Act
      const { result } = renderHook(() =>
        useCurrentSeasonStatus({ seasonId: mockSeasonId }),
      );

      // Assert
      expect(result.current.refresh).toBe(mockRefresh);
    });
  });

  describe('Options passing', () => {
    it('passes all options except seasonId and subscriptionId to useSeasonStatus', () => {
      // Arrange
      const options = {
        seasonId: mockSeasonId,
        enablePolling: true,
        pollingInterval: 120000,
        skipInitialFetch: true,
      };

      // Act
      renderHook(() => useCurrentSeasonStatus(options));

      // Assert
      expect(mockUseSeasonStatus).toHaveBeenCalledWith({
        enablePolling: true,
        pollingInterval: 120000,
        skipInitialFetch: true,
        seasonId: mockSeasonId,
        subscriptionId: mockSubscriptionResult.subscriptionId,
      });
    });

    it('passes default options when none provided', () => {
      // Act
      renderHook(() => useCurrentSeasonStatus());

      // Assert
      expect(mockUseSeasonStatus).toHaveBeenCalledWith({
        seasonId: undefined,
        subscriptionId: mockSubscriptionResult.subscriptionId,
      });
    });

    it('handles undefined seasonId gracefully', () => {
      // Act
      renderHook(() => useCurrentSeasonStatus({ seasonId: undefined }));

      // Assert
      expect(mockUseSeasonStatus).toHaveBeenCalledWith({
        seasonId: undefined,
        subscriptionId: mockSubscriptionResult.subscriptionId,
      });
    });
  });

  describe('Subscription changes', () => {
    it('updates subscriptionId when subscription changes', () => {
      // Arrange
      const { result, rerender } = renderHook(
        (props) => useCurrentSeasonStatus(props),
        {
          initialProps: { seasonId: mockSeasonId },
        },
      );

      // Verify initial state
      expect(mockUseSeasonStatus).toHaveBeenLastCalledWith({
        seasonId: mockSeasonId,
        subscriptionId: 'sub-12345678',
      });

      // Change subscription
      const newSubscriptionResult: UseRewardsSubscriptionResult = {
        ...mockSubscriptionResult,
        subscriptionId: 'sub-87654321',
      };

      mockUseRewardsSubscription.mockReturnValue(newSubscriptionResult);

      // Act
      rerender({ seasonId: mockSeasonId });

      // Assert
      expect(result.current.subscriptionId).toBe('sub-87654321');
      expect(mockUseSeasonStatus).toHaveBeenLastCalledWith({
        seasonId: mockSeasonId,
        subscriptionId: 'sub-87654321',
      });
    });

    it('handles subscription becoming null', () => {
      // Arrange
      const { rerender } = renderHook(
        (props) => useCurrentSeasonStatus(props),
        {
          initialProps: { seasonId: mockSeasonId },
        },
      );

      // Change to null subscription
      const nullSubscriptionResult: UseRewardsSubscriptionResult = {
        subscription: null,
        subscriptionId: null,
        isAuthenticated: false,
        lastAuthenticatedAccount: null,
      };

      mockUseRewardsSubscription.mockReturnValue(nullSubscriptionResult);

      // Act
      rerender({ seasonId: mockSeasonId });

      // Assert
      expect(mockUseSeasonStatus).toHaveBeenLastCalledWith({
        seasonId: mockSeasonId,
        subscriptionId: undefined,
      });
    });
  });

  describe('Edge cases', () => {
    it('handles missing seasonId with subscription available', () => {
      // Act
      renderHook(() => useCurrentSeasonStatus());

      // Assert
      expect(mockUseSeasonStatus).toHaveBeenCalledWith({
        seasonId: undefined,
        subscriptionId: mockSubscriptionResult.subscriptionId,
      });
    });

    it('handles both missing seasonId and no subscription', () => {
      // Arrange
      const unauthenticatedResult: UseRewardsSubscriptionResult = {
        subscription: null,
        subscriptionId: null,
        isAuthenticated: false,
        lastAuthenticatedAccount: null,
      };

      mockUseRewardsSubscription.mockReturnValue(unauthenticatedResult);

      // Act
      renderHook(() => useCurrentSeasonStatus());

      // Assert
      expect(mockUseSeasonStatus).toHaveBeenCalledWith({
        seasonId: undefined,
        subscriptionId: undefined,
      });
    });

    it('handles empty string subscriptionId', () => {
      // Arrange
      const emptySubscriptionResult: UseRewardsSubscriptionResult = {
        ...mockSubscriptionResult,
        subscriptionId: '',
      };

      mockUseRewardsSubscription.mockReturnValue(emptySubscriptionResult);

      // Act
      renderHook(() => useCurrentSeasonStatus({ seasonId: mockSeasonId }));

      // Assert
      expect(mockUseSeasonStatus).toHaveBeenCalledWith({
        seasonId: mockSeasonId,
        subscriptionId: undefined, // Empty string should be converted to undefined
      });
    });

    it('maintains stable return value structure', () => {
      // Arrange
      const { result, rerender } = renderHook(() =>
        useCurrentSeasonStatus({ seasonId: mockSeasonId }),
      );

      const initialKeys = Object.keys(result.current);

      // Act - rerender multiple times
      rerender();
      rerender();
      rerender();

      // Assert - return value should have consistent structure
      const currentKeys = Object.keys(result.current);
      expect(currentKeys).toEqual(initialKeys);
      expect(currentKeys).toEqual([
        'seasonStatus',
        'isLoading',
        'error',
        'refresh',
        'isRefreshing',
        'isAuthenticated',
        'subscriptionId',
        'lastAuthenticatedAccount',
      ]);
    });

    it('combines all return values correctly', () => {
      // Arrange - set up specific mock returns
      const customSeasonStatusResult: UseSeasonStatusResult = {
        seasonStatus: mockSeasonStatus,
        isLoading: false,
        isRefreshing: true,
        error: 'Custom error',
        refresh: jest.fn(),
      };

      const customSubscriptionResult: UseRewardsSubscriptionResult = {
        subscription: {
          id: 'custom-sub',
          referralCode: 'CUSTOM123',
        },
        subscriptionId: 'custom-sub',
        isAuthenticated: true,
        lastAuthenticatedAccount: '0xCustomAccount',
      };

      mockUseSeasonStatus.mockReturnValue(customSeasonStatusResult);
      mockUseRewardsSubscription.mockReturnValue(customSubscriptionResult);

      // Act
      const { result } = renderHook(() =>
        useCurrentSeasonStatus({ seasonId: mockSeasonId }),
      );

      // Assert - all values should be combined correctly
      expect(result.current).toEqual({
        // From useSeasonStatus
        seasonStatus: mockSeasonStatus,
        isLoading: false,
        error: 'Custom error',
        refresh: customSeasonStatusResult.refresh,
        isRefreshing: true,
        // From useRewardsSubscription
        isAuthenticated: true,
        subscriptionId: 'custom-sub',
        lastAuthenticatedAccount: '0xCustomAccount',
      });
    });
  });
});
