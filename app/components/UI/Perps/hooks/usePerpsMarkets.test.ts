import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import { usePerpsMarkets } from './usePerpsMarkets';
import type { PerpsMarketData } from '../controllers/types';

// Mock dependencies
jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getActiveProvider: jest.fn(),
    },
  },
}));

// Mock PerpsConnectionProvider
jest.mock('../providers/PerpsConnectionProvider', () => ({
  usePerpsConnection: jest.fn(() => ({
    isConnected: true,
    isConnecting: false,
    isInitialized: true,
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    resetError: jest.fn(),
  })),
}));

// Mock data
const mockMarketData: PerpsMarketData[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    maxLeverage: '40x',
    price: '$50,000.00',
    change24h: '+2.5%',
    change24hPercent: '2.5',
    volume: '$1.2B',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    maxLeverage: '25x',
    price: '$3,000.00',
    change24h: '-1.2%',
    change24hPercent: '-1.2',
    volume: '$800M',
  },
];

const mockProvider = {
  protocolId: 'hyperliquid',
  getMarketDataWithPrices: jest.fn(),
  getDepositRoutes: jest.fn(),
  getWithdrawalRoutes: jest.fn(),
  placeOrder: jest.fn(),
  editOrder: jest.fn(),
  cancelOrder: jest.fn(),
  closePosition: jest.fn(),
  getPositions: jest.fn(),
  getAccountState: jest.fn(),
  getMarkets: jest.fn(),
  withdraw: jest.fn(),
  subscribeToPrices: jest.fn(),
  subscribeToPositions: jest.fn(),
  subscribeToOrderFills: jest.fn(),
  setLiveDataConfig: jest.fn(),
  disconnect: jest.fn(),
  toggleTestnet: jest.fn(),
  initialize: jest.fn(),
  isReadyToTrade: jest.fn(),
  deposit: jest.fn(),
  validateDeposit: jest.fn(),
  calculateLiquidationPrice: jest.fn(),
  calculateMaintenanceMargin: jest.fn(),
  getMaxLeverage: jest.fn(),
  calculateFees: jest.fn().mockResolvedValue({
    feeRate: 0.00045,
    feeAmount: 45,
  }),
  updatePositionTPSL: jest.fn().mockResolvedValue({
    success: true,
    orderId: '123',
  }),
  checkWithdrawalStatus: jest.fn().mockResolvedValue({
    status: 'pending',
    metadata: {},
  }),
  validateOrder: jest.fn().mockResolvedValue({ isValid: true }),
  validateClosePosition: jest.fn().mockResolvedValue({ isValid: true }),
  validateWithdrawal: jest.fn().mockResolvedValue({ isValid: true }),
  getBlockExplorerUrl: jest.fn(),
  getOrderFills: jest.fn(),
  getOrders: jest.fn(),
  getOpenOrders: jest.fn(),
  getFunding: jest.fn(),
  getIsFirstTimeUser: jest.fn(),
} as const;

const mockPerpsController = Engine.context.PerpsController as jest.Mocked<
  typeof Engine.context.PerpsController
>;
const mockLogger = DevLogger as jest.Mocked<typeof DevLogger>;

describe('usePerpsMarkets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Set up default mocks
    mockPerpsController.getActiveProvider.mockReturnValue(mockProvider);
    mockProvider.getMarketDataWithPrices.mockResolvedValue(mockMarketData);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial state', () => {
    it('returns initial state with empty markets and loading true', () => {
      // Act
      const { result } = renderHook(() => usePerpsMarkets());

      // Assert
      expect(result.current.markets).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.refresh).toBe('function');
    });

    it('returns initial state with loading false when skipInitialFetch is true', () => {
      // Act
      const { result } = renderHook(() =>
        usePerpsMarkets({ skipInitialFetch: true }),
      );

      // Assert
      expect(result.current.markets).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Successful data fetching', () => {
    it('fetches market data successfully on mount', async () => {
      // Act
      const { result } = renderHook(() => usePerpsMarkets());

      // Wait for async operations
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.markets).toEqual(mockMarketData);
      expect(result.current.error).toBeNull();
      expect(mockProvider.getMarketDataWithPrices).toHaveBeenCalledTimes(1);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Perps: Fetching market data from active provider...',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Perps: Successfully fetched and transformed market data',
        { marketCount: 2 },
      );
    });

    it('skips initial fetch when skipInitialFetch is true', async () => {
      // Act
      const { result } = renderHook(() =>
        usePerpsMarkets({ skipInitialFetch: true }),
      );

      // Wait a bit to ensure no async operations are triggered
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.markets).toEqual([]);
      expect(mockProvider.getMarketDataWithPrices).not.toHaveBeenCalled();
    });

    it('updates markets when data changes', async () => {
      // Arrange
      const { result } = renderHook(() => usePerpsMarkets());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newMarketData = [
        {
          symbol: 'DOGE',
          name: 'Dogecoin',
          maxLeverage: '10x',
          price: '$0.10',
          change24h: '+5.0%',
          change24hPercent: '5.0',
          volume: '$100M',
        },
      ];

      mockProvider.getMarketDataWithPrices.mockResolvedValue(newMarketData);

      // Act
      await act(async () => {
        await result.current.refresh();
      });

      // Assert
      expect(result.current.markets).toEqual(newMarketData);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('handles fetch errors with empty markets', async () => {
      // Arrange
      const errorMessage = 'Network error';
      mockProvider.getMarketDataWithPrices.mockRejectedValue(
        new Error(errorMessage),
      );

      // Act
      const { result } = renderHook(() => usePerpsMarkets());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.markets).toEqual([]);
      expect(result.current.error).toBe(errorMessage);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Perps: Failed to fetch market data',
        expect.any(Error),
      );
    });

    it('handles fetch errors with existing markets', async () => {
      // Arrange
      const { result } = renderHook(() => usePerpsMarkets());

      // Wait for initial successful fetch
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.markets).toEqual(mockMarketData);

      // Set up error for next call
      const errorMessage = 'Network error';
      mockProvider.getMarketDataWithPrices.mockRejectedValue(
        new Error(errorMessage),
      );

      // Act
      await act(async () => {
        await result.current.refresh();
      });

      // Assert - should keep existing data on error
      expect(result.current.markets).toEqual(mockMarketData);
      expect(result.current.error).toBe(errorMessage);
    });

    it('handles unknown error types', async () => {
      // Arrange
      mockProvider.getMarketDataWithPrices.mockRejectedValue('String error');

      // Act
      const { result } = renderHook(() => usePerpsMarkets());

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
      const { result } = renderHook(() => usePerpsMarkets());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear previous calls
      mockProvider.getMarketDataWithPrices.mockClear();

      // Act
      await act(async () => {
        await result.current.refresh();
      });

      // Assert
      expect(mockProvider.getMarketDataWithPrices).toHaveBeenCalledTimes(1);
      expect(result.current.markets).toEqual(mockMarketData);
    });

    it('sets isRefreshing to true during refresh', async () => {
      // Arrange
      const { result } = renderHook(() => usePerpsMarkets());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Make the next call hang to test refreshing state
      let resolvePromise: (value: PerpsMarketData[]) => void;
      const hangingPromise = new Promise<PerpsMarketData[]>((resolve) => {
        resolvePromise = resolve;
      });
      mockProvider.getMarketDataWithPrices.mockReturnValue(hangingPromise);

      // Act
      act(() => {
        result.current.refresh();
      });

      // Assert - should be refreshing
      expect(result.current.isRefreshing).toBe(true);
      expect(result.current.isLoading).toBe(false);

      // Complete the promise
      act(() => {
        resolvePromise(mockMarketData);
      });

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });
    });

    it('clears error on successful refresh', async () => {
      // Arrange
      mockProvider.getMarketDataWithPrices.mockRejectedValueOnce(
        new Error('Initial error'),
      );

      const { result } = renderHook(() => usePerpsMarkets());

      await waitFor(() => {
        expect(result.current.error).toBe('Initial error');
      });

      // Set up successful response for refresh
      mockProvider.getMarketDataWithPrices.mockResolvedValue(mockMarketData);

      // Act
      await act(async () => {
        await result.current.refresh();
      });

      // Assert
      expect(result.current.error).toBeNull();
      expect(result.current.markets).toEqual(mockMarketData);
    });
  });

  describe('Polling functionality', () => {
    it('does not poll when enablePolling is false', async () => {
      // Arrange
      const { result } = renderHook(() =>
        usePerpsMarkets({ enablePolling: false }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockProvider.getMarketDataWithPrices.mockClear();

      // Act - advance time beyond default polling interval
      act(() => {
        jest.advanceTimersByTime(65000);
      });

      // Assert
      expect(mockProvider.getMarketDataWithPrices).not.toHaveBeenCalled();
    });

    it('polls at default interval when enablePolling is true', async () => {
      // Arrange
      const { result } = renderHook(() =>
        usePerpsMarkets({ enablePolling: true }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockProvider.getMarketDataWithPrices.mockClear();

      // Act - advance time to trigger polling
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      // Assert
      expect(mockProvider.getMarketDataWithPrices).toHaveBeenCalledTimes(1);
    });

    it('polls at custom interval when specified', async () => {
      // Arrange
      const customInterval = 30000;
      const { result } = renderHook(() =>
        usePerpsMarkets({
          enablePolling: true,
          pollingInterval: customInterval,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockProvider.getMarketDataWithPrices.mockClear();

      // Act - advance time to custom interval
      act(() => {
        jest.advanceTimersByTime(customInterval);
      });

      // Assert
      expect(mockProvider.getMarketDataWithPrices).toHaveBeenCalledTimes(1);
    });

    it('continues polling multiple times', async () => {
      // Arrange
      const { result } = renderHook(() =>
        usePerpsMarkets({ enablePolling: true }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockProvider.getMarketDataWithPrices.mockClear();

      // Act - advance time for multiple intervals
      act(() => {
        jest.advanceTimersByTime(60000);
      });
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      // Assert
      expect(mockProvider.getMarketDataWithPrices).toHaveBeenCalledTimes(2);
    });

    it('clears polling interval on unmount', async () => {
      // Arrange
      const { result, unmount } = renderHook(() =>
        usePerpsMarkets({ enablePolling: true }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act
      unmount();
      mockProvider.getMarketDataWithPrices.mockClear();

      act(() => {
        jest.advanceTimersByTime(60000);
      });

      // Assert
      expect(mockProvider.getMarketDataWithPrices).not.toHaveBeenCalled();
    });
  });

  describe('Options configuration', () => {
    it('applies default options when none provided', () => {
      // Act
      const { result } = renderHook(() => usePerpsMarkets());

      // Assert - should start loading (default skipInitialFetch: false)
      expect(result.current.isLoading).toBe(true);
    });

    it('applies custom options correctly', async () => {
      // Arrange
      const options = {
        enablePolling: true,
        pollingInterval: 45000,
        skipInitialFetch: true,
      };

      // Act
      const { result } = renderHook(() => usePerpsMarkets(options));

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(mockProvider.getMarketDataWithPrices).not.toHaveBeenCalled();

      // Test polling with custom interval
      mockProvider.getMarketDataWithPrices.mockClear();
      act(() => {
        jest.advanceTimersByTime(45000);
      });

      expect(mockProvider.getMarketDataWithPrices).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading states', () => {
    it('maintains correct loading state during initial fetch', async () => {
      // Arrange
      let resolvePromise: (value: PerpsMarketData[]) => void;
      const hangingPromise = new Promise<PerpsMarketData[]>((resolve) => {
        resolvePromise = resolve;
      });
      mockProvider.getMarketDataWithPrices.mockReturnValue(hangingPromise);

      // Act
      const { result } = renderHook(() => usePerpsMarkets());

      // Assert - should be loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isRefreshing).toBe(false);

      // Complete the promise
      act(() => {
        resolvePromise(mockMarketData);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('maintains correct loading state during refresh', async () => {
      // Arrange
      const { result } = renderHook(() => usePerpsMarkets());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let resolvePromise: (value: PerpsMarketData[]) => void;
      const hangingPromise = new Promise<PerpsMarketData[]>((resolve) => {
        resolvePromise = resolve;
      });
      mockProvider.getMarketDataWithPrices.mockReturnValue(hangingPromise);

      // Act
      act(() => {
        result.current.refresh();
      });

      // Assert - should be refreshing, not loading
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isRefreshing).toBe(true);

      // Complete the promise
      act(() => {
        resolvePromise(mockMarketData);
      });

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });
    });
  });

  describe('Edge cases', () => {
    it('handles provider not available', async () => {
      // Arrange
      mockPerpsController.getActiveProvider.mockImplementation(() => {
        throw new Error('Provider not available');
      });

      // Act
      const { result } = renderHook(() => usePerpsMarkets());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.error).toBe('Provider not available');
      expect(result.current.markets).toEqual([]);
    });

    it('handles empty market data response', async () => {
      // Arrange
      mockProvider.getMarketDataWithPrices.mockResolvedValue([]);

      // Act
      const { result } = renderHook(() => usePerpsMarkets());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.markets).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('handles concurrent refresh calls', async () => {
      // Arrange
      const { result } = renderHook(() => usePerpsMarkets());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockProvider.getMarketDataWithPrices.mockClear();

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
      expect(mockProvider.getMarketDataWithPrices).toHaveBeenCalledTimes(3);
    });
  });
});
