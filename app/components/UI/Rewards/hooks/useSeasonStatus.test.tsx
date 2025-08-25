import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import { useSeasonStatus } from './useSeasonStatus';
import type { SeasonStatusDto } from '../../../../core/Engine/controllers/rewards-controller/types';

// Mock dependencies
jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('../../../../core/Engine');

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

const mockLogger = DevLogger as jest.Mocked<typeof DevLogger>;

describe('useSeasonStatus', () => {
  const mockSeasonId = 'season-1';
  const mockSubscriptionId = 'sub-12345678';
  const mockControllerMessengerCall = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock Engine controllerMessenger
    (
      Engine as unknown as {
        controllerMessenger: { call: jest.Mock };
      }
    ).controllerMessenger = {
      call: mockControllerMessengerCall,
    };

    // Mock successful API call by default
    mockControllerMessengerCall.mockResolvedValue(mockSeasonStatus);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial state', () => {
    it('returns initial state with null season status and loading true', () => {
      // Act
      const { result } = renderHook(() =>
        useSeasonStatus({
          seasonId: mockSeasonId,
          subscriptionId: mockSubscriptionId,
        }),
      );

      // Assert
      expect(result.current.seasonStatus).toBeNull();
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.refresh).toBe('function');
    });

    it('returns initial state with loading false when skipInitialFetch is true', () => {
      // Act
      const { result } = renderHook(() =>
        useSeasonStatus({
          seasonId: mockSeasonId,
          subscriptionId: mockSubscriptionId,
          skipInitialFetch: true,
        }),
      );

      // Assert
      expect(result.current.seasonStatus).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Successful data fetching', () => {
    it('fetches season status successfully on mount', async () => {
      // Act
      const { result } = renderHook(() =>
        useSeasonStatus({
          seasonId: mockSeasonId,
          subscriptionId: mockSubscriptionId,
        }),
      );

      // Wait for async operations
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.seasonStatus).toEqual(mockSeasonStatus);
      expect(result.current.error).toBeNull();
      expect(mockControllerMessengerCall).toHaveBeenCalledTimes(1);
      expect(mockControllerMessengerCall).toHaveBeenCalledWith(
        'RewardsDataService:getSeasonStatus',
        mockSeasonId,
        mockSubscriptionId,
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Rewards: Fetching season status data...',
        {
          seasonId: mockSeasonId,
          subscriptionId: mockSubscriptionId.substring(0, 8) + '...',
        },
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Rewards: Successfully fetched season status data',
        {
          seasonName: mockSeasonStatus.season.name,
          balance: mockSeasonStatus.balance.total,
          currentTier: mockSeasonStatus.currentTierId,
        },
      );
    });

    it('skips initial fetch when skipInitialFetch is true', async () => {
      // Act
      const { result } = renderHook(() =>
        useSeasonStatus({
          seasonId: mockSeasonId,
          subscriptionId: mockSubscriptionId,
          skipInitialFetch: true,
        }),
      );

      // Wait a bit to ensure no async operations are triggered
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.seasonStatus).toBeNull();
      expect(mockControllerMessengerCall).not.toHaveBeenCalled();
    });

    it('updates season status when data changes', async () => {
      // Arrange
      const { result } = renderHook(() =>
        useSeasonStatus({
          seasonId: mockSeasonId,
          subscriptionId: mockSubscriptionId,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newSeasonStatus: SeasonStatusDto = {
        ...mockSeasonStatus,
        balance: {
          ...mockSeasonStatus.balance,
          total: 2500,
          refereePortion: 500,
        },
        currentTierId: 'tier-3',
      };

      mockControllerMessengerCall.mockResolvedValue(newSeasonStatus);

      // Act
      await act(async () => {
        await result.current.refresh();
      });

      // Assert
      expect(result.current.seasonStatus).toEqual(newSeasonStatus);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('handles fetch errors with null season status', async () => {
      // Arrange
      const errorMessage = 'Authentication failed';
      mockControllerMessengerCall.mockRejectedValue(new Error(errorMessage));

      // Act
      const { result } = renderHook(() =>
        useSeasonStatus({
          seasonId: mockSeasonId,
          subscriptionId: mockSubscriptionId,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.seasonStatus).toBeNull();
      expect(result.current.error).toBe(errorMessage);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Rewards: Failed to fetch season status data',
        expect.any(Error),
      );
    });

    it('handles fetch errors with existing season status', async () => {
      // Arrange
      const { result } = renderHook(() =>
        useSeasonStatus({
          seasonId: mockSeasonId,
          subscriptionId: mockSubscriptionId,
        }),
      );

      // Wait for initial successful fetch
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.seasonStatus).toEqual(mockSeasonStatus);

      // Set up error for next call
      const errorMessage = 'Network timeout';
      mockControllerMessengerCall.mockRejectedValue(new Error(errorMessage));

      // Act
      await act(async () => {
        await result.current.refresh();
      });

      // Assert - should keep existing data on error
      expect(result.current.seasonStatus).toEqual(mockSeasonStatus);
      expect(result.current.error).toBe(errorMessage);
    });

    it('handles unknown error types', async () => {
      // Arrange
      mockControllerMessengerCall.mockRejectedValue('String error');

      // Act
      const { result } = renderHook(() =>
        useSeasonStatus({
          seasonId: mockSeasonId,
          subscriptionId: mockSubscriptionId,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.error).toBe('Unknown error occurred');
    });
  });

  describe('Refresh functionality', () => {
    it('refreshes data when refresh function is called', async () => {
      // Arrange
      const { result } = renderHook(() =>
        useSeasonStatus({
          seasonId: mockSeasonId,
          subscriptionId: mockSubscriptionId,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear previous calls
      mockControllerMessengerCall.mockClear();

      // Act
      await act(async () => {
        await result.current.refresh();
      });

      // Assert
      expect(mockControllerMessengerCall).toHaveBeenCalledTimes(1);
      expect(mockControllerMessengerCall).toHaveBeenCalledWith(
        'RewardsDataService:getSeasonStatus',
        mockSeasonId,
        mockSubscriptionId,
      );
      expect(result.current.seasonStatus).toEqual(mockSeasonStatus);
    });

    it('sets isRefreshing to true during refresh', async () => {
      // Arrange
      const { result } = renderHook(() =>
        useSeasonStatus({
          seasonId: mockSeasonId,
          subscriptionId: mockSubscriptionId,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Make the next call hang to test refreshing state
      let resolvePromise: (value: SeasonStatusDto) => void;
      const hangingPromise = new Promise<SeasonStatusDto>((resolve) => {
        resolvePromise = resolve;
      });
      mockControllerMessengerCall.mockReturnValue(hangingPromise);

      // Act
      act(() => {
        result.current.refresh();
      });

      // Assert - should be refreshing
      expect(result.current.isRefreshing).toBe(true);
      expect(result.current.isLoading).toBe(false);

      // Complete the promise
      act(() => {
        resolvePromise(mockSeasonStatus);
      });

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });
    });

    it('clears error on successful refresh', async () => {
      // Arrange
      mockControllerMessengerCall.mockRejectedValueOnce(
        new Error('Initial error'),
      );

      const { result } = renderHook(() =>
        useSeasonStatus({
          seasonId: mockSeasonId,
          subscriptionId: mockSubscriptionId,
        }),
      );

      await waitFor(() => {
        expect(result.current.error).toBe('Initial error');
      });

      // Set up successful response for refresh
      mockControllerMessengerCall.mockResolvedValue(mockSeasonStatus);

      // Act
      await act(async () => {
        await result.current.refresh();
      });

      // Assert
      expect(result.current.error).toBeNull();
      expect(result.current.seasonStatus).toEqual(mockSeasonStatus);
    });
  });

  describe('Polling functionality', () => {
    it('does not poll when enablePolling is false', async () => {
      // Arrange
      const { result } = renderHook(() =>
        useSeasonStatus({
          seasonId: mockSeasonId,
          subscriptionId: mockSubscriptionId,
          enablePolling: false,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockControllerMessengerCall.mockClear();

      // Act - advance time beyond default polling interval
      act(() => {
        jest.advanceTimersByTime(305000); // 5+ minutes
      });

      // Assert
      expect(mockControllerMessengerCall).not.toHaveBeenCalled();
    });

    it('polls at default interval when enablePolling is true', async () => {
      // Arrange
      const { result } = renderHook(() =>
        useSeasonStatus({
          seasonId: mockSeasonId,
          subscriptionId: mockSubscriptionId,
          enablePolling: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockControllerMessengerCall.mockClear();

      // Act - advance time to trigger polling (default 5 minutes)
      act(() => {
        jest.advanceTimersByTime(300000);
      });

      // Assert
      expect(mockControllerMessengerCall).toHaveBeenCalledTimes(1);
    });

    it('polls at custom interval when specified', async () => {
      // Arrange
      const customInterval = 120000; // 2 minutes
      const { result } = renderHook(() =>
        useSeasonStatus({
          seasonId: mockSeasonId,
          subscriptionId: mockSubscriptionId,
          enablePolling: true,
          pollingInterval: customInterval,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockControllerMessengerCall.mockClear();

      // Act - advance time to custom interval
      act(() => {
        jest.advanceTimersByTime(customInterval);
      });

      // Assert
      expect(mockControllerMessengerCall).toHaveBeenCalledTimes(1);
    });

    it('continues polling multiple times', async () => {
      // Arrange
      const { result } = renderHook(() =>
        useSeasonStatus({
          seasonId: mockSeasonId,
          subscriptionId: mockSubscriptionId,
          enablePolling: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockControllerMessengerCall.mockClear();

      // Act - advance time for multiple intervals
      act(() => {
        jest.advanceTimersByTime(300000);
      });
      act(() => {
        jest.advanceTimersByTime(300000);
      });

      // Assert
      expect(mockControllerMessengerCall).toHaveBeenCalledTimes(2);
    });

    it('clears polling interval on unmount', async () => {
      // Arrange
      const { result, unmount } = renderHook(() =>
        useSeasonStatus({
          seasonId: mockSeasonId,
          subscriptionId: mockSubscriptionId,
          enablePolling: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act
      unmount();
      mockControllerMessengerCall.mockClear();

      act(() => {
        jest.advanceTimersByTime(300000);
      });

      // Assert
      expect(mockControllerMessengerCall).not.toHaveBeenCalled();
    });

    it('does not poll when required parameters are missing', async () => {
      // Arrange
      renderHook(() =>
        useSeasonStatus({
          seasonId: mockSeasonId,
          enablePolling: true,
        }),
      );

      // Act - advance time beyond polling interval
      act(() => {
        jest.advanceTimersByTime(300000);
      });

      // Assert
      expect(mockControllerMessengerCall).not.toHaveBeenCalled();
    });
  });

  describe('Options configuration', () => {
    it('applies default options when none provided', () => {
      // Act
      const { result } = renderHook(() =>
        useSeasonStatus({
          seasonId: mockSeasonId,
          subscriptionId: mockSubscriptionId,
        }),
      );

      // Assert - should start loading (default skipInitialFetch: false)
      expect(result.current.isLoading).toBe(true);
    });

    it('applies custom options correctly', async () => {
      // Arrange
      const options = {
        seasonId: mockSeasonId,
        subscriptionId: mockSubscriptionId,
        enablePolling: true,
        pollingInterval: 180000, // 3 minutes
        skipInitialFetch: true,
      };

      // Act
      const { result } = renderHook(() => useSeasonStatus(options));

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(mockControllerMessengerCall).not.toHaveBeenCalled();

      // Test polling with custom interval
      mockControllerMessengerCall.mockClear();
      act(() => {
        jest.advanceTimersByTime(180000);
      });

      expect(mockControllerMessengerCall).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading states', () => {
    it('maintains correct loading state during initial fetch', async () => {
      // Arrange
      let resolvePromise: (value: SeasonStatusDto) => void;
      const hangingPromise = new Promise<SeasonStatusDto>((resolve) => {
        resolvePromise = resolve;
      });
      mockControllerMessengerCall.mockReturnValue(hangingPromise);

      // Act
      const { result } = renderHook(() =>
        useSeasonStatus({
          seasonId: mockSeasonId,
          subscriptionId: mockSubscriptionId,
        }),
      );

      // Assert - should be loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isRefreshing).toBe(false);

      // Complete the promise
      act(() => {
        resolvePromise(mockSeasonStatus);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('maintains correct loading state during refresh', async () => {
      // Arrange
      const { result } = renderHook(() =>
        useSeasonStatus({
          seasonId: mockSeasonId,
          subscriptionId: mockSubscriptionId,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let resolvePromise: (value: SeasonStatusDto) => void;
      const hangingPromise = new Promise<SeasonStatusDto>((resolve) => {
        resolvePromise = resolve;
      });
      mockControllerMessengerCall.mockReturnValue(hangingPromise);

      // Act
      act(() => {
        result.current.refresh();
      });

      // Assert - should be refreshing, not loading
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isRefreshing).toBe(true);

      // Complete the promise
      act(() => {
        resolvePromise(mockSeasonStatus);
      });

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });
    });
  });

  describe('Edge cases', () => {
    it('handles concurrent refresh calls', async () => {
      // Arrange
      const { result } = renderHook(() =>
        useSeasonStatus({
          seasonId: mockSeasonId,
          subscriptionId: mockSubscriptionId,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockControllerMessengerCall.mockClear();

      // Act - call refresh multiple times quickly
      act(() => {
        result.current.refresh();
        result.current.refresh();
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });

      // Assert - should not call API more than the number of refresh calls
      expect(mockControllerMessengerCall).toHaveBeenCalledTimes(3);
    });

    it('handles parameter changes during hook lifecycle', async () => {
      // Arrange
      const initialProps = {
        seasonId: mockSeasonId,
        subscriptionId: mockSubscriptionId,
      };

      const { result, rerender } = renderHook(
        (props) => useSeasonStatus(props),
        {
          initialProps,
        },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockControllerMessengerCall).toHaveBeenCalledWith(
        'RewardsDataService:getSeasonStatus',
        mockSeasonId,
        mockSubscriptionId,
      );

      mockControllerMessengerCall.mockClear();

      // Act - change parameters
      const newProps = {
        seasonId: 'season-2',
        subscriptionId: 'sub-87654321',
      };

      rerender(newProps);

      await waitFor(() => {
        expect(mockControllerMessengerCall).toHaveBeenCalledWith(
          'RewardsDataService:getSeasonStatus',
          'season-2',
          'sub-87654321',
        );
      });

      // Assert
      expect(mockControllerMessengerCall).toHaveBeenCalledTimes(1);
    });
  });
});
