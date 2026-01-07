import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePerpsMarketFills } from './usePerpsMarketFills';
import { usePerpsLiveFills } from './stream';
import Engine from '../../../../core/Engine';
import type { OrderFill } from '../controllers/types';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => () => ({ address: '0xMockAddress' })),
}));

jest.mock('./stream', () => ({
  usePerpsLiveFills: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getActiveProvider: jest.fn(),
    },
  },
}));

const mockLoggerError = jest.fn();
jest.mock('../../../../util/Logger', () => ({
  error: (...args: unknown[]) => mockLoggerError(...args),
}));

const mockUsePerpsLiveFills = usePerpsLiveFills as jest.MockedFunction<
  typeof usePerpsLiveFills
>;

const mockGetActiveProvider = Engine.context.PerpsController
  .getActiveProvider as jest.MockedFunction<
  typeof Engine.context.PerpsController.getActiveProvider
>;

// Test data
const createMockFill = (overrides: Partial<OrderFill> = {}): OrderFill => ({
  orderId: 'order-1',
  symbol: 'BTC',
  side: 'buy',
  size: '0.5',
  price: '50000',
  pnl: '100.5',
  direction: 'Open Long',
  fee: '25.50',
  feeToken: 'USDC',
  timestamp: 1640995200000,
  startPosition: '0',
  success: true,
  ...overrides,
});

const mockBtcFill1 = createMockFill({
  orderId: 'btc-1',
  symbol: 'BTC',
  timestamp: 1640995200000,
});

const mockBtcFill2 = createMockFill({
  orderId: 'btc-2',
  symbol: 'BTC',
  timestamp: 1640995100000,
});

const mockEthFill = createMockFill({
  orderId: 'eth-1',
  symbol: 'ETH',
  timestamp: 1640995150000,
});

const mockHypeFill = createMockFill({
  orderId: 'hype-1',
  symbol: 'HYPE',
  timestamp: 1640995050000,
});

describe('usePerpsMarketFills', () => {
  let mockProvider: {
    getOrderFills: jest.MockedFunction<() => Promise<OrderFill[]>>;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up mock provider
    mockProvider = {
      getOrderFills: jest.fn().mockResolvedValue([]),
    };

    mockGetActiveProvider.mockReturnValue(
      mockProvider as unknown as ReturnType<
        typeof Engine.context.PerpsController.getActiveProvider
      >,
    );

    // Default WebSocket mock - not loading, empty fills
    mockUsePerpsLiveFills.mockReturnValue({
      fills: [],
      isInitialLoading: false,
    });
  });

  describe('initial state', () => {
    it('returns empty fills when WebSocket has no data', () => {
      // Arrange
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [],
        isInitialLoading: false,
      });

      // Act
      const { result } = renderHook(() =>
        usePerpsMarketFills({ symbol: 'BTC' }),
      );

      // Assert
      expect(result.current.fills).toEqual([]);
      expect(result.current.isInitialLoading).toBe(false);
      expect(result.current.isRefreshing).toBe(false);
    });

    it('returns loading true when WebSocket is loading', () => {
      // Arrange
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [],
        isInitialLoading: true,
      });

      // Act
      const { result } = renderHook(() =>
        usePerpsMarketFills({ symbol: 'BTC' }),
      );

      // Assert
      expect(result.current.isInitialLoading).toBe(true);
    });
  });

  describe('symbol filtering', () => {
    it('filters WebSocket fills to only include requested symbol', () => {
      // Arrange
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [mockBtcFill1, mockEthFill, mockBtcFill2],
        isInitialLoading: false,
      });

      // Act
      const { result } = renderHook(() =>
        usePerpsMarketFills({ symbol: 'BTC' }),
      );

      // Assert
      expect(result.current.fills).toHaveLength(2);
      expect(result.current.fills.every((f) => f.symbol === 'BTC')).toBe(true);
    });

    it('returns empty array when no fills match symbol', () => {
      // Arrange
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [mockBtcFill1, mockEthFill],
        isInitialLoading: false,
      });

      // Act
      const { result } = renderHook(() =>
        usePerpsMarketFills({ symbol: 'SOL' }),
      );

      // Assert
      expect(result.current.fills).toEqual([]);
    });

    it('filters REST fills to only include requested symbol', async () => {
      // Arrange
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [],
        isInitialLoading: false,
      });
      mockProvider.getOrderFills.mockResolvedValue([
        mockBtcFill1,
        mockEthFill,
        mockHypeFill,
      ]);

      // Act
      const { result } = renderHook(() =>
        usePerpsMarketFills({ symbol: 'HYPE' }),
      );

      // Assert
      await waitFor(() => {
        expect(result.current.fills).toHaveLength(1);
      });
      expect(result.current.fills[0].symbol).toBe('HYPE');
    });
  });

  describe('data merging', () => {
    it('merges WebSocket and REST fills with deduplication', async () => {
      // Arrange - same fill in both sources
      const sharedFill = createMockFill({
        orderId: 'shared-1',
        symbol: 'BTC',
        timestamp: 1640995200000,
      });

      mockUsePerpsLiveFills.mockReturnValue({
        fills: [sharedFill],
        isInitialLoading: false,
      });
      mockProvider.getOrderFills.mockResolvedValue([sharedFill, mockBtcFill2]);

      // Act
      const { result } = renderHook(() =>
        usePerpsMarketFills({ symbol: 'BTC' }),
      );

      // Assert - should have 2 fills, not 3 (deduped)
      await waitFor(() => {
        expect(result.current.fills).toHaveLength(2);
      });
    });

    it('prefers WebSocket data over REST data for duplicates', async () => {
      // Arrange - same orderId+timestamp but different prices
      const restFill = createMockFill({
        orderId: 'order-1',
        symbol: 'BTC',
        timestamp: 1640995200000,
        price: '49000', // REST has older price
      });
      const wsFill = createMockFill({
        orderId: 'order-1',
        symbol: 'BTC',
        timestamp: 1640995200000,
        price: '50000', // WebSocket has fresher price
      });

      mockUsePerpsLiveFills.mockReturnValue({
        fills: [wsFill],
        isInitialLoading: false,
      });
      mockProvider.getOrderFills.mockResolvedValue([restFill]);

      // Act
      const { result } = renderHook(() =>
        usePerpsMarketFills({ symbol: 'BTC' }),
      );

      // Assert - should use WebSocket price
      await waitFor(() => {
        expect(result.current.fills).toHaveLength(1);
      });
      expect(result.current.fills[0].price).toBe('50000');
    });

    it('combines unique fills from both sources', async () => {
      // Arrange
      const wsFill = createMockFill({
        orderId: 'ws-only',
        symbol: 'BTC',
        timestamp: 1640995300000,
      });
      const restFill = createMockFill({
        orderId: 'rest-only',
        symbol: 'BTC',
        timestamp: 1640995100000,
      });

      mockUsePerpsLiveFills.mockReturnValue({
        fills: [wsFill],
        isInitialLoading: false,
      });
      mockProvider.getOrderFills.mockResolvedValue([restFill]);

      // Act
      const { result } = renderHook(() =>
        usePerpsMarketFills({ symbol: 'BTC' }),
      );

      // Assert
      await waitFor(() => {
        expect(result.current.fills).toHaveLength(2);
      });
      expect(result.current.fills.map((f) => f.orderId)).toContain('ws-only');
      expect(result.current.fills.map((f) => f.orderId)).toContain('rest-only');
    });
  });

  describe('sorting', () => {
    it('sorts fills by timestamp descending (newest first)', async () => {
      // Arrange
      const oldFill = createMockFill({
        orderId: 'old',
        symbol: 'BTC',
        timestamp: 1640995000000,
      });
      const newFill = createMockFill({
        orderId: 'new',
        symbol: 'BTC',
        timestamp: 1640995300000,
      });
      const middleFill = createMockFill({
        orderId: 'middle',
        symbol: 'BTC',
        timestamp: 1640995150000,
      });

      mockUsePerpsLiveFills.mockReturnValue({
        fills: [oldFill, newFill, middleFill],
        isInitialLoading: false,
      });

      // Act
      const { result } = renderHook(() =>
        usePerpsMarketFills({ symbol: 'BTC' }),
      );

      // Assert
      expect(result.current.fills[0].orderId).toBe('new');
      expect(result.current.fills[1].orderId).toBe('middle');
      expect(result.current.fills[2].orderId).toBe('old');
    });
  });

  describe('REST API fetching', () => {
    it('fetches REST fills on mount with 3-month lookback', async () => {
      // Arrange
      const mockNow = 1700000000000;
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      mockUsePerpsLiveFills.mockReturnValue({
        fills: [],
        isInitialLoading: false,
      });
      mockProvider.getOrderFills.mockResolvedValue([mockBtcFill1]);

      // Act
      renderHook(() => usePerpsMarketFills({ symbol: 'BTC' }));

      // Assert
      await waitFor(() => {
        expect(mockProvider.getOrderFills).toHaveBeenCalledWith({
          aggregateByTime: false,
          startTime: mockNow - PERPS_CONSTANTS.FILLS_LOOKBACK_MS,
        });
      });

      jest.restoreAllMocks();
    });

    it('uses FILLS_LOOKBACK_MS constant for 3-month window', async () => {
      // Arrange
      const mockNow = 1700000000000;
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      mockUsePerpsLiveFills.mockReturnValue({
        fills: [],
        isInitialLoading: false,
      });
      mockProvider.getOrderFills.mockResolvedValue([]);

      // Act
      renderHook(() => usePerpsMarketFills({ symbol: 'BTC' }));

      // Assert - verify lookback is approximately 3 months (90 days)
      const expectedStartTime = mockNow - PERPS_CONSTANTS.FILLS_LOOKBACK_MS;
      await waitFor(() => {
        expect(mockProvider.getOrderFills).toHaveBeenCalledWith(
          expect.objectContaining({
            startTime: expectedStartTime,
          }),
        );
      });
      // Verify the constant is approximately 90 days in milliseconds
      expect(PERPS_CONSTANTS.FILLS_LOOKBACK_MS).toBe(90 * 24 * 60 * 60 * 1000);

      jest.restoreAllMocks();
    });

    it('handles REST API errors gracefully', async () => {
      // Arrange
      mockLoggerError.mockClear();
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [mockBtcFill1],
        isInitialLoading: false,
      });
      mockProvider.getOrderFills.mockRejectedValue(new Error('API Error'));

      // Act
      const { result } = renderHook(() =>
        usePerpsMarketFills({ symbol: 'BTC' }),
      );

      // Assert - should still show WebSocket fills and log error to Sentry
      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            extra: expect.objectContaining({
              hook: 'usePerpsMarketFills',
              method: 'fetchRestFills',
            }),
          }),
        );
      });
      expect(result.current.fills).toHaveLength(1);
    });

    it('handles missing provider gracefully', async () => {
      // Arrange
      mockGetActiveProvider.mockReturnValue(
        null as unknown as ReturnType<
          typeof Engine.context.PerpsController.getActiveProvider
        >,
      );
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [mockBtcFill1],
        isInitialLoading: false,
      });

      // Act
      const { result } = renderHook(() =>
        usePerpsMarketFills({ symbol: 'BTC' }),
      );

      // Assert - should work with just WebSocket fills
      expect(result.current.fills).toHaveLength(1);
    });
  });

  describe('refresh functionality', () => {
    it('refetches REST data on refresh', async () => {
      // Arrange
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [],
        isInitialLoading: false,
      });
      mockProvider.getOrderFills.mockResolvedValue([]);

      const { result } = renderHook(() =>
        usePerpsMarketFills({ symbol: 'BTC' }),
      );

      await waitFor(() => {
        expect(mockProvider.getOrderFills).toHaveBeenCalledTimes(1);
      });

      // Update mock for refresh
      mockProvider.getOrderFills.mockResolvedValue([mockBtcFill1]);

      // Act
      await act(async () => {
        await result.current.refresh();
      });

      // Assert
      expect(mockProvider.getOrderFills).toHaveBeenCalledTimes(2);
      expect(result.current.fills).toHaveLength(1);
    });

    it('sets isRefreshing during refresh', async () => {
      // Arrange
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [],
        isInitialLoading: false,
      });

      let resolvePromise: ((value: OrderFill[]) => void) | undefined;
      const slowPromise = new Promise<OrderFill[]>((resolve) => {
        resolvePromise = resolve;
      });
      mockProvider.getOrderFills.mockReturnValue(slowPromise);

      const { result } = renderHook(() =>
        usePerpsMarketFills({ symbol: 'BTC' }),
      );

      // Act - start refresh
      let refreshPromise: Promise<void> | undefined;
      act(() => {
        refreshPromise = result.current.refresh();
      });

      // Assert - should be refreshing
      expect(result.current.isRefreshing).toBe(true);

      // Complete the refresh
      await act(async () => {
        if (resolvePromise) {
          resolvePromise([]);
        }
        if (refreshPromise) {
          await refreshPromise;
        }
      });

      // Assert - should no longer be refreshing
      expect(result.current.isRefreshing).toBe(false);
    });

    it('resets isRefreshing on refresh error', async () => {
      // Arrange
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(jest.fn());
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [],
        isInitialLoading: false,
      });
      mockProvider.getOrderFills
        .mockResolvedValueOnce([]) // Initial fetch
        .mockRejectedValueOnce(new Error('Refresh error')); // Refresh fails

      const { result } = renderHook(() =>
        usePerpsMarketFills({ symbol: 'BTC' }),
      );

      await waitFor(() => {
        expect(mockProvider.getOrderFills).toHaveBeenCalledTimes(1);
      });

      // Act
      await act(async () => {
        await result.current.refresh();
      });

      // Assert
      expect(result.current.isRefreshing).toBe(false);

      consoleError.mockRestore();
    });
  });

  describe('throttleMs option', () => {
    it('passes throttleMs to usePerpsLiveFills', () => {
      // Arrange & Act
      renderHook(() => usePerpsMarketFills({ symbol: 'BTC', throttleMs: 500 }));

      // Assert
      expect(mockUsePerpsLiveFills).toHaveBeenCalledWith({ throttleMs: 500 });
    });

    it('defaults throttleMs to 0 for instant updates', () => {
      // Arrange & Act
      renderHook(() => usePerpsMarketFills({ symbol: 'BTC' }));

      // Assert
      expect(mockUsePerpsLiveFills).toHaveBeenCalledWith({ throttleMs: 0 });
    });
  });

  describe('symbol changes', () => {
    it('updates fills when symbol prop changes', async () => {
      // Arrange
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [mockBtcFill1, mockEthFill],
        isInitialLoading: false,
      });

      const { result, rerender } = renderHook(
        ({ symbol }: { symbol: string }) => usePerpsMarketFills({ symbol }),
        { initialProps: { symbol: 'BTC' } },
      );

      // Assert initial state
      expect(result.current.fills).toHaveLength(1);
      expect(result.current.fills[0].symbol).toBe('BTC');

      // Act - change symbol
      rerender({ symbol: 'ETH' });

      // Assert
      expect(result.current.fills).toHaveLength(1);
      expect(result.current.fills[0].symbol).toBe('ETH');
    });
  });
});
