import { renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { useHasExistingPosition } from './useHasExistingPosition';
import { usePerpsLivePositions, usePerpsLiveFills } from './stream';
import type { Position, OrderFill } from '../controllers/types';

// Mock the stream hooks
jest.mock('./stream', () => ({
  usePerpsLivePositions: jest.fn(),
  usePerpsLiveFills: jest.fn(),
}));

// Mock Engine for REST fallback
const mockGetOrderFills = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getOrderFills: (...args: unknown[]) => mockGetOrderFills(...args),
    },
  },
}));

// Mock Logger
jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
}));

describe('useHasExistingPosition', () => {
  const mockUsePerpsLivePositions =
    usePerpsLivePositions as jest.MockedFunction<typeof usePerpsLivePositions>;
  const mockUsePerpsLiveFills = usePerpsLiveFills as jest.MockedFunction<
    typeof usePerpsLiveFills
  >;

  const mockPositions: Position[] = [
    {
      symbol: 'BTC',
      size: '0.5',
      entryPrice: '45000',
      positionValue: '22500',
      unrealizedPnl: '500',
      marginUsed: '2250',
      leverage: {
        type: 'isolated',
        value: 10,
      },
      liquidationPrice: '40500',
      maxLeverage: 50,
      returnOnEquity: '22.22',
      cumulativeFunding: {
        allTime: '50',
        sinceOpen: '30',
        sinceChange: '10',
      },
      takeProfitCount: 0,
      stopLossCount: 0,
    },
    {
      symbol: 'ETH',
      size: '-1.2',
      entryPrice: '3000',
      positionValue: '3600',
      unrealizedPnl: '-100',
      marginUsed: '720',
      leverage: {
        type: 'isolated',
        value: 5,
      },
      liquidationPrice: '3300',
      maxLeverage: 50,
      returnOnEquity: '-13.89',
      cumulativeFunding: {
        allTime: '20',
        sinceOpen: '15',
        sinceChange: '5',
      },
      takeProfitCount: 0,
      stopLossCount: 0,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no fills
    mockUsePerpsLiveFills.mockReturnValue({
      fills: [],
      isInitialLoading: false,
    });
    // Default: REST returns empty
    mockGetOrderFills.mockResolvedValue([]);
  });

  it('returns hasPosition as true when position exists for asset', () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: mockPositions,
      isInitialLoading: false,
    });

    const { result } = renderHook(() =>
      useHasExistingPosition({ asset: 'BTC' }),
    );

    expect(result.current.hasPosition).toBe(true);
    expect(result.current.existingPosition).toEqual(mockPositions[0]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('returns hasPosition as false when no position exists for asset', () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: mockPositions,
      isInitialLoading: false,
    });

    const { result } = renderHook(() =>
      useHasExistingPosition({ asset: 'SOL' }),
    );

    expect(result.current.hasPosition).toBe(false);
    expect(result.current.existingPosition).toBe(null);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('returns loading state as false (WebSocket loads from cache)', () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: false,
    });

    const { result } = renderHook(() =>
      useHasExistingPosition({ asset: 'BTC' }),
    );

    expect(result.current.hasPosition).toBe(false);
    expect(result.current.existingPosition).toBe(null);
    expect(result.current.isLoading).toBe(false); // Always false with WebSocket
    expect(result.current.error).toBe(null);
  });

  it('returns error as null (WebSocket handles errors internally)', () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: false,
    });

    const { result } = renderHook(() =>
      useHasExistingPosition({ asset: 'BTC' }),
    );

    expect(result.current.hasPosition).toBe(false);
    expect(result.current.existingPosition).toBe(null);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null); // Always null with WebSocket
  });

  it('ignores loadOnMount parameter (WebSocket loads from cache)', () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: false,
    });

    const { result } = renderHook(() =>
      useHasExistingPosition({ asset: 'BTC', loadOnMount: false }),
    );

    // loadOnMount is ignored in WebSocket implementation
    expect(result.current.hasPosition).toBe(false);
  });

  it('handles empty positions array', () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: false,
    });

    const { result } = renderHook(() =>
      useHasExistingPosition({ asset: 'BTC' }),
    );

    expect(result.current.hasPosition).toBe(false);
    expect(result.current.existingPosition).toBe(null);
  });

  it('updates when positions change', () => {
    // Initially no positions
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: false,
    });

    const { result, rerender } = renderHook(() =>
      useHasExistingPosition({ asset: 'BTC' }),
    );

    expect(result.current.hasPosition).toBe(false);

    // Update with positions
    mockUsePerpsLivePositions.mockReturnValue({
      positions: mockPositions,
      isInitialLoading: false,
    });

    rerender();
    expect(result.current.hasPosition).toBe(true);
    expect(result.current.existingPosition).toEqual(mockPositions[0]);
  });

  it('returns a no-op refreshPosition function', async () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: mockPositions,
      isInitialLoading: false,
    });

    const { result } = renderHook(() =>
      useHasExistingPosition({ asset: 'BTC' }),
    );

    // refreshPosition should be a no-op that returns a resolved promise
    await expect(result.current.refreshPosition()).resolves.toBeUndefined();
  });

  describe('positionOpenedTimestamp', () => {
    const mockFills: OrderFill[] = [
      {
        orderId: 'order-1',
        symbol: 'BTC',
        side: 'buy',
        direction: 'Open Long',
        timestamp: 1700000000000,
        size: '0.5',
        price: '45000',
        pnl: '0',
        fee: '0.001',
        feeToken: 'USDC',
      },
      {
        orderId: 'order-2',
        symbol: 'ETH',
        side: 'buy',
        direction: 'Open Long',
        timestamp: 1700000001000,
        size: '1.0',
        price: '3000',
        pnl: '0',
        fee: '0.01',
        feeToken: 'USDC',
      },
    ];

    it('returns positionOpenedTimestamp from WebSocket fills', () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: mockPositions,
        isInitialLoading: false,
      });
      mockUsePerpsLiveFills.mockReturnValue({
        fills: mockFills,
        isInitialLoading: false,
      });

      const { result } = renderHook(() =>
        useHasExistingPosition({ asset: 'BTC' }),
      );

      expect(result.current.positionOpenedTimestamp).toBe(1700000000000);
    });

    it('returns undefined when no matching fill exists in WebSocket', () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: mockPositions,
        isInitialLoading: false,
      });
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [mockFills[1]], // Only ETH fill
        isInitialLoading: false,
      });

      const { result } = renderHook(() =>
        useHasExistingPosition({ asset: 'BTC' }),
      );

      // No BTC fill in WebSocket, and REST hasn't returned yet
      expect(result.current.positionOpenedTimestamp).toBeUndefined();
    });

    it('returns undefined when no position exists', () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });
      mockUsePerpsLiveFills.mockReturnValue({
        fills: mockFills,
        isInitialLoading: false,
      });

      const { result } = renderHook(() =>
        useHasExistingPosition({ asset: 'BTC' }),
      );

      expect(result.current.positionOpenedTimestamp).toBeUndefined();
    });

    it('falls back to REST API when WebSocket has no fill', async () => {
      const restTimestamp = Date.now() - 5 * 60 * 1000;
      mockUsePerpsLivePositions.mockReturnValue({
        positions: mockPositions,
        isInitialLoading: false,
      });
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [], // No WebSocket fills
        isInitialLoading: false,
      });
      mockGetOrderFills.mockResolvedValue([
        {
          orderId: 'order-rest-1',
          symbol: 'BTC',
          side: 'buy',
          direction: 'Open Long',
          timestamp: restTimestamp,
          size: '0.5',
          price: '45000',
          pnl: '0',
          fee: '0.001',
          feeToken: 'USDC',
        },
      ]);

      const { result } = renderHook(() =>
        useHasExistingPosition({ asset: 'BTC' }),
      );

      // Wait for REST fallback to complete
      await waitFor(() => {
        expect(result.current.positionOpenedTimestamp).toBe(restTimestamp);
      });

      expect(mockGetOrderFills).toHaveBeenCalledWith(
        expect.objectContaining({
          startTime: expect.any(Number),
        }),
      );
    });

    it('prefers WebSocket timestamp over REST', () => {
      const wsTimestamp = 1700000000000;
      mockUsePerpsLivePositions.mockReturnValue({
        positions: mockPositions,
        isInitialLoading: false,
      });
      mockUsePerpsLiveFills.mockReturnValue({
        fills: mockFills, // Has BTC fill with wsTimestamp
        isInitialLoading: false,
      });

      const { result } = renderHook(() =>
        useHasExistingPosition({ asset: 'BTC' }),
      );

      // Should use WebSocket timestamp, not trigger REST fallback
      expect(result.current.positionOpenedTimestamp).toBe(wsTimestamp);
      expect(mockGetOrderFills).not.toHaveBeenCalled();
    });

    it('clears stale timestamp when switching positions', async () => {
      const btcTimestamp = Date.now() - 10 * 60 * 1000;
      const ethTimestamp = Date.now() - 5 * 60 * 1000;

      // Start with BTC position, REST returns BTC fill
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockPositions[0]], // BTC only
        isInitialLoading: false,
      });
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [],
        isInitialLoading: false,
      });
      mockGetOrderFills.mockResolvedValueOnce([
        {
          orderId: 'order-btc-1',
          symbol: 'BTC',
          side: 'buy',
          direction: 'Open Long',
          timestamp: btcTimestamp,
          size: '0.5',
          price: '45000',
          pnl: '0',
          fee: '0.001',
          feeToken: 'USDC',
        },
      ]);

      const { result, rerender } = renderHook(
        ({ asset }) => useHasExistingPosition({ asset }),
        { initialProps: { asset: 'BTC' } },
      );

      // Wait for BTC timestamp
      await waitFor(() => {
        expect(result.current.positionOpenedTimestamp).toBe(btcTimestamp);
      });

      // Switch to ETH position
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockPositions[1]], // ETH only
        isInitialLoading: false,
      });
      mockGetOrderFills.mockResolvedValueOnce([
        {
          orderId: 'order-eth-1',
          symbol: 'ETH',
          side: 'buy',
          direction: 'Open Long',
          timestamp: ethTimestamp,
          size: '1.0',
          price: '3000',
          pnl: '0',
          fee: '0.01',
          feeToken: 'USDC',
        },
      ]);

      rerender({ asset: 'ETH' });

      // BTC timestamp should be cleared, then ETH timestamp should be set
      await waitFor(() => {
        expect(result.current.positionOpenedTimestamp).toBe(ethTimestamp);
      });
    });

    it('fetches fresh timestamp when same symbol position is closed and reopened', async () => {
      const oldTimestamp = Date.now() - 60 * 60 * 1000; // 1 hour ago (old position)
      const newTimestamp = Date.now() - 5 * 60 * 1000; // 5 minutes ago (new position)

      // Start with BTC position
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockPositions[0]], // BTC
        isInitialLoading: false,
      });
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [], // No WebSocket fills
        isInitialLoading: false,
      });

      // First REST fetch returns old timestamp
      mockGetOrderFills.mockResolvedValueOnce([
        {
          orderId: 'order-btc-old',
          symbol: 'BTC',
          side: 'buy',
          direction: 'Open Long',
          timestamp: oldTimestamp,
          size: '0.5',
          price: '45000',
          pnl: '0',
          fee: '0.001',
          feeToken: 'USDC',
        },
      ]);

      const { result, rerender } = renderHook(
        ({ asset }) => useHasExistingPosition({ asset }),
        { initialProps: { asset: 'BTC' } },
      );

      // Wait for old timestamp to be set
      await waitFor(() => {
        expect(result.current.positionOpenedTimestamp).toBe(oldTimestamp);
      });
      expect(mockGetOrderFills).toHaveBeenCalledTimes(1);

      // Close position (set positions to empty)
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });
      rerender({ asset: 'BTC' });

      // Timestamp should be cleared
      expect(result.current.positionOpenedTimestamp).toBeUndefined();
      expect(result.current.hasPosition).toBe(false);

      // Reopen position with same symbol (BTC)
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockPositions[0]], // BTC again
        isInitialLoading: false,
      });

      // Second REST fetch returns new timestamp
      mockGetOrderFills.mockResolvedValueOnce([
        {
          orderId: 'order-btc-new',
          symbol: 'BTC',
          side: 'buy',
          direction: 'Open Long',
          timestamp: newTimestamp,
          size: '0.3',
          price: '50000',
          pnl: '0',
          fee: '0.001',
          feeToken: 'USDC',
        },
      ]);

      rerender({ asset: 'BTC' });

      // Should fetch fresh timestamp for the reopened position
      await waitFor(() => {
        expect(result.current.positionOpenedTimestamp).toBe(newTimestamp);
      });

      // REST should have been called twice (once for old, once for new position)
      expect(mockGetOrderFills).toHaveBeenCalledTimes(2);
    });
  });
});
