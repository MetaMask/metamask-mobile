import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import { usePerpsFunding } from './usePerpsFunding';
import type { Funding, GetFundingParams } from '../controllers/types';
import { CaipAccountId } from '@metamask/utils';

// Mock dependencies
jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getFunding: jest.fn(),
    },
  },
}));

// Mock data
const mockFunding: Funding[] = [
  {
    symbol: 'BTC',
    amountUsd: '12.50',
    rate: '0.00008',
    timestamp: 1640995200000,
    transactionHash: '0x123abc',
  },
  {
    symbol: 'ETH',
    amountUsd: '-8.75',
    rate: '-0.00012',
    timestamp: 1640995100000,
    transactionHash: '0x456def',
  },
  {
    symbol: 'SOL',
    amountUsd: '3.25',
    rate: '0.00005',
    timestamp: 1640995000000,
  }, // No transaction hash
  {
    symbol: 'DOGE',
    amountUsd: '-1.50',
    rate: '-0.00003',
    timestamp: 1640994900000,
    transactionHash: '0x789ghi',
  },
];

const mockPerpsController = Engine.context.PerpsController as jest.Mocked<
  typeof Engine.context.PerpsController
>;
const mockLogger = DevLogger as jest.Mocked<typeof DevLogger>;

describe('usePerpsFunding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Set up default successful mock
    mockPerpsController.getFunding.mockResolvedValue(mockFunding);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial state', () => {
    it('returns initial state with empty funding and loading true', () => {
      // Act
      const { result } = renderHook(() => usePerpsFunding());

      // Assert
      expect(result.current.funding).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.refresh).toBe('function');
    });

    it('returns initial state with loading false when skipInitialFetch is true', () => {
      // Act
      const { result } = renderHook(() =>
        usePerpsFunding({ skipInitialFetch: true }),
      );

      // Assert
      expect(result.current.funding).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Successful data fetching', () => {
    it('fetches funding data successfully on mount', async () => {
      // Act
      const { result } = renderHook(() => usePerpsFunding());

      // Wait for async operations
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.funding).toEqual(mockFunding);
      expect(result.current.error).toBeNull();
      expect(mockPerpsController.getFunding).toHaveBeenCalledTimes(1);
      expect(mockPerpsController.getFunding).toHaveBeenCalledWith(undefined);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Perps: Fetching funding data from controller...',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Perps: Successfully fetched funding data',
        { fundingCount: 4 },
      );
    });

    it('skips initial fetch when skipInitialFetch is true', async () => {
      // Act
      const { result } = renderHook(() =>
        usePerpsFunding({ skipInitialFetch: true }),
      );

      // Wait a bit to ensure no async operations are triggered
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.funding).toEqual([]);
      expect(mockPerpsController.getFunding).not.toHaveBeenCalled();
    });

    it('passes params correctly to controller', async () => {
      // Arrange
      const params: GetFundingParams = {
        accountId: 'eip155:1:0x123' as CaipAccountId,
        startTime: 1640994000000,
        endTime: 1640996000000,
        limit: 50,
        offset: 10,
      };

      // Act
      const { result } = renderHook(() => usePerpsFunding({ params }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(mockPerpsController.getFunding).toHaveBeenCalledWith(params);
    });

    it('updates funding when data changes', async () => {
      // Arrange
      const { result } = renderHook(() => usePerpsFunding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newFunding: Funding[] = [
        {
          symbol: 'AVAX',
          amountUsd: '5.25',
          rate: '0.00010',
          timestamp: 1640995500000,
          transactionHash: '0xnewabc',
        },
      ];

      // Mock new response
      mockPerpsController.getFunding.mockResolvedValue(newFunding);

      // Act - trigger refresh
      await act(async () => {
        await result.current.refresh();
      });

      // Assert
      expect(result.current.funding).toEqual(newFunding);
      expect(result.current.error).toBeNull();
    });

    it('handles positive and negative funding amounts correctly', async () => {
      // Arrange
      const mixedFunding: Funding[] = [
        {
          symbol: 'BTC',
          amountUsd: '100.00',
          rate: '0.0001',
          timestamp: 1640995200000,
        },
        {
          symbol: 'ETH',
          amountUsd: '-50.00',
          rate: '-0.0002',
          timestamp: 1640995100000,
        },
        {
          symbol: 'SOL',
          amountUsd: '0.00',
          rate: '0.0000',
          timestamp: 1640995000000,
        },
      ];

      mockPerpsController.getFunding.mockResolvedValue(mixedFunding);

      // Act
      const { result } = renderHook(() => usePerpsFunding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.funding).toEqual(mixedFunding);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('handles fetch errors with empty funding', async () => {
      // Arrange
      const errorMessage = 'Network error';
      mockPerpsController.getFunding.mockRejectedValue(new Error(errorMessage));

      // Act
      const { result } = renderHook(() => usePerpsFunding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.funding).toEqual([]);
      expect(result.current.error).toBe(errorMessage);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Perps: Failed to fetch funding data',
        expect.any(Error),
      );
    });

    it('handles fetch errors with existing funding on refresh', async () => {
      // Arrange
      const { result } = renderHook(() => usePerpsFunding());

      // Wait for initial successful fetch
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.funding).toEqual(mockFunding);

      // Set up error for refresh
      const errorMessage = 'Refresh error';
      mockPerpsController.getFunding.mockRejectedValue(new Error(errorMessage));

      // Act - trigger refresh
      await act(async () => {
        await result.current.refresh();
      });

      // Assert - should keep existing data on refresh error
      expect(result.current.funding).toEqual(mockFunding);
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isRefreshing).toBe(false);
    });

    it('handles unknown error types', async () => {
      // Arrange
      mockPerpsController.getFunding.mockRejectedValue('String error');

      // Act
      const { result } = renderHook(() => usePerpsFunding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.error).toBe('Unknown error occurred');
      expect(result.current.funding).toEqual([]);
    });

    it('clears error on successful refresh', async () => {
      // Arrange
      mockPerpsController.getFunding.mockRejectedValueOnce(
        new Error('Initial error'),
      );

      const { result } = renderHook(() => usePerpsFunding());

      await waitFor(() => {
        expect(result.current.error).toBe('Initial error');
      });

      // Set up successful response for refresh
      mockPerpsController.getFunding.mockResolvedValue(mockFunding);

      // Act - trigger refresh
      await act(async () => {
        await result.current.refresh();
      });

      // Assert
      expect(result.current.error).toBeNull();
      expect(result.current.funding).toEqual(mockFunding);
    });
  });

  describe('Refresh functionality', () => {
    it('sets refreshing state correctly during refresh', async () => {
      // Arrange
      const { result } = renderHook(() => usePerpsFunding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock slow response
      let resolvePromise: (value: Funding[]) => void;
      const slowPromise = new Promise<Funding[]>((resolve) => {
        resolvePromise = resolve;
      });
      mockPerpsController.getFunding.mockReturnValue(slowPromise);

      // Act - trigger refresh
      act(() => {
        result.current.refresh();
      });

      // Assert - should be refreshing
      expect(result.current.isRefreshing).toBe(true);
      expect(result.current.isLoading).toBe(false);

      // Complete the promise
      act(() => {
        resolvePromise(mockFunding);
      });

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });
    });

    it('can be called multiple times without issues', async () => {
      // Arrange
      const { result } = renderHook(() => usePerpsFunding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act - call refresh multiple times
      await act(async () => {
        await Promise.all([
          result.current.refresh(),
          result.current.refresh(),
          result.current.refresh(),
        ]);
      });

      // Assert - should still work correctly
      expect(result.current.funding).toEqual(mockFunding);
      expect(result.current.error).toBeNull();
      expect(result.current.isRefreshing).toBe(false);
    });
  });

  describe('Polling functionality', () => {
    it('does not poll by default', async () => {
      // Arrange
      const { result } = renderHook(() => usePerpsFunding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Reset call count
      jest.clearAllMocks();

      // Act - advance time
      act(() => {
        jest.advanceTimersByTime(120000); // 2 minutes
      });

      // Assert - should not have polled
      expect(mockPerpsController.getFunding).not.toHaveBeenCalled();
    });

    it('polls when enablePolling is true', async () => {
      // Arrange
      const pollingInterval = 60000; // 60 seconds (default for funding)
      const { result } = renderHook(() =>
        usePerpsFunding({ enablePolling: true, pollingInterval }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Reset call count
      jest.clearAllMocks();

      // Act - advance time by polling interval
      act(() => {
        jest.advanceTimersByTime(pollingInterval);
      });

      // Wait for the polling request to complete
      await waitFor(() => {
        expect(mockPerpsController.getFunding).toHaveBeenCalledTimes(1);
      });

      // Act - advance time again
      act(() => {
        jest.advanceTimersByTime(pollingInterval);
      });

      await waitFor(() => {
        expect(mockPerpsController.getFunding).toHaveBeenCalledTimes(2);
      });
    });

    it('uses custom polling interval correctly', async () => {
      // Arrange
      const customInterval = 120000; // 2 minutes
      const { result } = renderHook(() =>
        usePerpsFunding({
          enablePolling: true,
          pollingInterval: customInterval,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      jest.clearAllMocks();

      // Act - advance time less than interval
      act(() => {
        jest.advanceTimersByTime(customInterval - 1000);
      });

      // Assert - should not poll yet
      expect(mockPerpsController.getFunding).not.toHaveBeenCalled();

      // Act - advance time to complete interval
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockPerpsController.getFunding).toHaveBeenCalledTimes(1);
      });
    });

    it('stops polling when component unmounts', async () => {
      // Arrange
      const pollingInterval = 30000;
      const { result, unmount } = renderHook(() =>
        usePerpsFunding({ enablePolling: true, pollingInterval }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      jest.clearAllMocks();

      // Act - unmount component
      unmount();

      // Advance time
      act(() => {
        jest.advanceTimersByTime(pollingInterval * 3);
      });

      // Assert - should not poll after unmount
      expect(mockPerpsController.getFunding).not.toHaveBeenCalled();
    });
  });

  describe('Parameter changes', () => {
    it('refetches data when params change', async () => {
      // Arrange
      const initialParams: GetFundingParams = { limit: 25 };
      const { result, rerender } = renderHook(
        ({ params }: { params?: GetFundingParams }) =>
          usePerpsFunding({ params }),
        { initialProps: { params: initialParams } },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockPerpsController.getFunding).toHaveBeenCalledWith(
        initialParams,
      );

      // Reset call count
      jest.clearAllMocks();

      // Act - change params
      const newParams: GetFundingParams = { limit: 100 };
      rerender({ params: newParams });

      await waitFor(() => {
        expect(mockPerpsController.getFunding).toHaveBeenCalledWith(newParams);
      });
    });

    it('handles time range parameter changes', async () => {
      // Arrange
      const { result, rerender } = renderHook(
        ({ params }: { params?: GetFundingParams }) =>
          usePerpsFunding({ params }),
        {
          initialProps: {
            params: {
              startTime: 1640990000000,
              endTime: 1640995000000,
            },
          },
        },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      jest.clearAllMocks();

      // Act - change time range
      rerender({
        params: {
          startTime: 1640995000000,
          endTime: 1641000000000,
        },
      });

      await waitFor(() => {
        expect(mockPerpsController.getFunding).toHaveBeenCalledWith({
          startTime: 1640995000000,
          endTime: 1641000000000,
        });
      });
    });

    it('handles params object reference changes correctly', async () => {
      // Arrange
      const { result, rerender } = renderHook(
        ({ params }: { params?: GetFundingParams }) =>
          usePerpsFunding({ params }),
        { initialProps: { params: { limit: 25 } } },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      jest.clearAllMocks();

      // Act - same values, different object reference
      rerender({ params: { limit: 25 } });

      // Wait a bit to see if it triggers a refetch
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Assert - should refetch due to object reference change
      await waitFor(() => {
        expect(mockPerpsController.getFunding).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Edge cases', () => {
    it('handles empty response array', async () => {
      // Arrange
      mockPerpsController.getFunding.mockResolvedValue([]);

      // Act
      const { result } = renderHook(() => usePerpsFunding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.funding).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('handles null/undefined response gracefully', async () => {
      // Arrange
      mockPerpsController.getFunding.mockResolvedValue(
        null as unknown as Funding[],
      );

      // Act
      const { result } = renderHook(() => usePerpsFunding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - should handle gracefully
      expect(result.current.funding).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('maintains loading state consistency during concurrent requests', async () => {
      // Arrange
      let resolveFirst: (value: Funding[]) => void;
      let resolveSecond: (value: Funding[]) => void;

      const firstPromise = new Promise<Funding[]>((resolve) => {
        resolveFirst = resolve;
      });
      const secondPromise = new Promise<Funding[]>((resolve) => {
        resolveSecond = resolve;
      });

      mockPerpsController.getFunding
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise);

      // Act
      const { result } = renderHook(() => usePerpsFunding());

      // Start refresh while initial load is pending
      act(() => {
        result.current.refresh();
      });

      // Resolve both requests
      await act(async () => {
        resolveFirst([]);
        resolveSecond(mockFunding);

        // Wait for all promises to settle
        await firstPromise;
        await secondPromise;
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isRefreshing).toBe(false);
      });

      // Assert - should handle concurrent requests gracefully (last one wins)
      expect(result.current.funding).toEqual(mockFunding);
      expect(result.current.error).toBeNull();
    });

    it('handles funding with extreme values', async () => {
      // Arrange
      const extremeFunding: Funding[] = [
        {
          symbol: 'BTC',
          amountUsd: '999999.99',
          rate: '0.1',
          timestamp: 1640995200000,
        },
        {
          symbol: 'ETH',
          amountUsd: '-999999.99',
          rate: '-0.1',
          timestamp: 1640995100000,
        },
        {
          symbol: 'MICRO',
          amountUsd: '0.01',
          rate: '0.000001',
          timestamp: 1640995000000,
        },
      ];

      mockPerpsController.getFunding.mockResolvedValue(extremeFunding);

      // Act
      const { result } = renderHook(() => usePerpsFunding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.funding).toEqual(extremeFunding);
      expect(result.current.error).toBeNull();
    });

    it('handles funding with missing optional fields', async () => {
      // Arrange
      const fundingWithMissingFields: Funding[] = [
        {
          symbol: 'BTC',
          amountUsd: '10.00',
          rate: '0.0001',
          timestamp: 1640995200000,
          // transactionHash is missing
        },
        {
          symbol: 'ETH',
          amountUsd: '5.00',
          rate: '0.00005',
          timestamp: 1640995100000,
          transactionHash: '0x123',
        },
      ];

      mockPerpsController.getFunding.mockResolvedValue(
        fundingWithMissingFields,
      );

      // Act
      const { result } = renderHook(() => usePerpsFunding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.funding).toEqual(fundingWithMissingFields);
      expect(result.current.error).toBeNull();
    });
  });
});
