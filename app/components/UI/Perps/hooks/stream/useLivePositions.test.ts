import { renderHook, act, waitFor } from '@testing-library/react-native';
import React from 'react';
import { usePerpsLivePositions } from './usePerpsLivePositions';
import { type Position, type PriceUpdate } from '@metamask/perps-controller';

let mockSelectedAddress = '0x1111111111111111111111111111111111111111';
jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => mockSelectedAddress),
}));

// Mock Engine for lazy isInitialLoading check
let mockCachedUserData: {
  positions: Position[];
  orders: unknown[];
  accountState: unknown;
} | null = null;
let mockChannelPositionsSnapshot: Position[] | null | undefined;

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getCachedUserDataForActiveProvider: () => mockCachedUserData,
    },
  },
}));

// Mock the stream provider
const mockPositionsSubscribe = jest.fn();
const mockPricesSubscribe = jest.fn();
const mockPricesSubscribeToSymbols = jest.fn();

jest.mock('../../providers/PerpsStreamManager', () => ({
  usePerpsStream: jest.fn(() => ({
    positions: {
      subscribe: mockPositionsSubscribe,
      getSnapshot: () => mockChannelPositionsSnapshot,
    },
    prices: {
      subscribe: mockPricesSubscribe,
      subscribeToSymbols: mockPricesSubscribeToSymbols,
    },
  })),
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

describe('usePerpsLivePositions', () => {
  const mockPosition: Position = {
    symbol: 'BTC-PERP',
    size: '1.0',
    entryPrice: '50000',
    positionValue: '50000',
    unrealizedPnl: '1000',
    marginUsed: '5000',
    leverage: {
      type: 'isolated',
      value: 10,
    },
    liquidationPrice: '45000',
    maxLeverage: 50,
    returnOnEquity: '20',
    cumulativeFunding: {
      allTime: '0',
      sinceOpen: '0',
      sinceChange: '0',
    },
    takeProfitCount: 0,
    stopLossCount: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockCachedUserData = null;
    mockChannelPositionsSnapshot = undefined;
    mockSelectedAddress = '0x1111111111111111111111111111111111111111';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Subscription Lifecycle', () => {
    it('subscribes to positions on mount with specified throttle', () => {
      // Arrange
      const throttleMs = 3000;
      mockPositionsSubscribe.mockReturnValue(jest.fn());
      mockPricesSubscribe.mockReturnValue(jest.fn());

      // Act
      renderHook(() => usePerpsLivePositions({ throttleMs }));

      // Assert
      expect(mockPositionsSubscribe).toHaveBeenCalledWith({
        callback: expect.any(Function),
        onDelivery: expect.any(Function),
        throttleMs,
      });
    });

    it('does NOT subscribe to positions when enabled is false', () => {
      // Arrange
      mockPositionsSubscribe.mockReturnValue(jest.fn());

      // Act
      renderHook(() => usePerpsLivePositions({ enabled: false }));

      // Assert
      expect(mockPositionsSubscribe).not.toHaveBeenCalled();
    });

    it('does NOT subscribe to prices by default (useLivePnl: false)', () => {
      // Arrange - even with positions present, no price subscription by default
      mockChannelPositionsSnapshot = [{ ...mockPosition, symbol: 'BTC-PERP' }];
      mockPositionsSubscribe.mockReturnValue(jest.fn());
      mockPricesSubscribe.mockReturnValue(jest.fn());
      mockPricesSubscribeToSymbols.mockReturnValue(jest.fn());

      // Act
      renderHook(() => usePerpsLivePositions());

      // Assert - prices should NOT be subscribed via either API
      expect(mockPricesSubscribe).not.toHaveBeenCalled();
      expect(mockPricesSubscribeToSymbols).not.toHaveBeenCalled();
    });

    it('subscribes to prices (scoped to position symbols) only when useLivePnl: true', () => {
      // Arrange - seed positions so symbols can be derived for the scoped subscription
      mockChannelPositionsSnapshot = [
        { ...mockPosition, symbol: 'BTC-PERP' },
        { ...mockPosition, symbol: 'ETH-PERP' },
      ];
      mockPositionsSubscribe.mockReturnValue(jest.fn());
      mockPricesSubscribe.mockReturnValue(jest.fn());
      mockPricesSubscribeToSymbols.mockReturnValue(jest.fn());

      // Act
      renderHook(() => usePerpsLivePositions({ useLivePnl: true }));

      // Assert - subscribes via the symbol-scoped API, NOT the full price channel
      expect(mockPricesSubscribeToSymbols).toHaveBeenCalledWith({
        symbols: ['BTC-PERP', 'ETH-PERP'],
        callback: expect.any(Function),
        throttleMs: 0,
      });
      expect(mockPricesSubscribe).not.toHaveBeenCalled();
    });

    it('does NOT subscribe to prices when useLivePnl: true but there are no positions', () => {
      // Arrange - no positions means there is nothing to price-scope to
      mockChannelPositionsSnapshot = undefined;
      mockPositionsSubscribe.mockReturnValue(jest.fn());
      mockPricesSubscribe.mockReturnValue(jest.fn());
      mockPricesSubscribeToSymbols.mockReturnValue(jest.fn());

      // Act
      renderHook(() => usePerpsLivePositions({ useLivePnl: true }));

      // Assert
      expect(mockPricesSubscribeToSymbols).not.toHaveBeenCalled();
      expect(mockPricesSubscribe).not.toHaveBeenCalled();
    });

    it('unsubscribes from positions on unmount', () => {
      // Arrange
      const mockPositionsUnsubscribe = jest.fn();
      mockPositionsSubscribe.mockReturnValue(mockPositionsUnsubscribe);

      // Act
      const { unmount } = renderHook(() => usePerpsLivePositions());
      unmount();

      // Assert
      expect(mockPositionsUnsubscribe).toHaveBeenCalled();
    });

    it('unsubscribes from positions and prices on unmount when useLivePnl: true', () => {
      // Arrange - seed positions so the scoped price subscription is created
      mockChannelPositionsSnapshot = [{ ...mockPosition, symbol: 'BTC-PERP' }];
      const mockPositionsUnsubscribe = jest.fn();
      const mockPricesUnsubscribe = jest.fn();
      mockPositionsSubscribe.mockReturnValue(mockPositionsUnsubscribe);
      mockPricesSubscribeToSymbols.mockReturnValue(mockPricesUnsubscribe);

      // Act
      const { unmount } = renderHook(() =>
        usePerpsLivePositions({ useLivePnl: true }),
      );
      unmount();

      // Assert
      expect(mockPositionsUnsubscribe).toHaveBeenCalled();
      expect(mockPricesUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Position Updates', () => {
    it('updates positions and clears loading state when data arrives', async () => {
      let capturedCallback: (positions: Position[]) => void = jest.fn();
      mockPositionsSubscribe.mockImplementation((params) => {
        capturedCallback = params.callback;
        return jest.fn();
      });
      mockPricesSubscribe.mockReturnValue(jest.fn());

      const { result } = renderHook(() => usePerpsLivePositions());

      // Initially empty with loading state
      expect(result.current).toEqual({
        positions: [],
        isInitialLoading: true,
        deliveryRevision: 0,
        prices: {},
      });

      // Simulate positions update
      const positions: Position[] = [
        mockPosition,
        { ...mockPosition, symbol: 'ETH-PERP', size: '10.0' },
      ];

      act(() => {
        capturedCallback(positions);
      });

      await waitFor(() => {
        expect(result.current).toEqual({
          positions,
          isInitialLoading: false,
          deliveryRevision: 0,
          prices: {},
        });
      });
    });

    it('uses no throttling by default for instant position updates', () => {
      // Arrange
      mockPositionsSubscribe.mockReturnValue(jest.fn());
      mockPricesSubscribe.mockReturnValue(jest.fn());

      // Act
      renderHook(() => usePerpsLivePositions());

      // Assert
      expect(mockPositionsSubscribe).toHaveBeenCalledWith({
        callback: expect.any(Function),
        onDelivery: expect.any(Function),
        throttleMs: 0,
      });
    });

    it('resubscribes when throttle value changes', () => {
      const mockUnsubscribe1 = jest.fn();
      const mockUnsubscribe2 = jest.fn();
      mockPricesSubscribe.mockReturnValue(jest.fn());

      mockPositionsSubscribe
        .mockReturnValueOnce(mockUnsubscribe1)
        .mockReturnValueOnce(mockUnsubscribe2);

      const { rerender } = renderHook(
        ({ throttleMs }) => usePerpsLivePositions({ throttleMs }),
        {
          initialProps: { throttleMs: 0 },
        },
      );

      expect(mockPositionsSubscribe).toHaveBeenCalledWith({
        callback: expect.any(Function),
        onDelivery: expect.any(Function),
        throttleMs: 0,
      });

      // Change throttle
      rerender({ throttleMs: 2000 });

      // Verify old subscription cleaned up and new one created
      expect(mockUnsubscribe1).toHaveBeenCalled();
      expect(mockPositionsSubscribe).toHaveBeenCalledWith({
        callback: expect.any(Function),
        onDelivery: expect.any(Function),
        throttleMs: 2000,
      });
    });

    it('handles empty positions array without unnecessary re-renders', async () => {
      let capturedCallback: (positions: Position[]) => void = jest.fn();
      mockPositionsSubscribe.mockImplementation((params) => {
        capturedCallback = params.callback;
        return jest.fn();
      });
      mockPricesSubscribe.mockReturnValue(jest.fn());

      const { result } = renderHook(() => usePerpsLivePositions());

      act(() => {
        capturedCallback([]);
      });

      await waitFor(() => {
        expect(result.current).toEqual({
          positions: [],
          isInitialLoading: false,
          deliveryRevision: 0,
          prices: {},
        });
      });
    });

    it('handles null updates gracefully by maintaining loading state', async () => {
      // Arrange
      let capturedCallback: (positions: Position[] | null) => void = jest.fn();
      mockPositionsSubscribe.mockImplementation((params) => {
        capturedCallback = params.callback;
        return jest.fn();
      });
      mockPricesSubscribe.mockReturnValue(jest.fn());

      const { result } = renderHook(() => usePerpsLivePositions());

      // Act
      act(() => {
        capturedCallback(null);
      });

      // Assert
      expect(result.current).toEqual({
        positions: [],
        isInitialLoading: true,
        deliveryRevision: 0,
        prices: {},
      });
    });

    it('transitions from loading to loaded when receiving valid positions after null', async () => {
      // Arrange
      let capturedCallback: (positions: Position[] | null) => void = jest.fn();
      mockPositionsSubscribe.mockImplementation((params) => {
        capturedCallback = params.callback;
        return jest.fn();
      });
      mockPricesSubscribe.mockReturnValue(jest.fn());

      const { result } = renderHook(() => usePerpsLivePositions());
      const validPositions: Position[] = [mockPosition];

      // Act
      act(() => {
        capturedCallback(null);
      });

      expect(result.current.isInitialLoading).toBe(true);

      act(() => {
        capturedCallback(validPositions);
      });

      // Assert
      await waitFor(() => {
        expect(result.current).toEqual({
          positions: validPositions,
          isInitialLoading: false,
          deliveryRevision: 0,
          prices: {},
        });
      });
    });

    it('resets to loading when null received after having loaded positions (account switch)', async () => {
      let capturedCallback: (positions: Position[] | null) => void = jest.fn();
      mockPositionsSubscribe.mockImplementation((params) => {
        capturedCallback = params.callback;
        return jest.fn();
      });
      mockPricesSubscribe.mockReturnValue(jest.fn());

      const { result, rerender } = renderHook(() => usePerpsLivePositions());

      // First: receive real positions (simulate loaded state)
      act(() => {
        capturedCallback([mockPosition]);
      });

      await waitFor(() => {
        expect(result.current.isInitialLoading).toBe(false);
        expect(result.current.positions).toEqual([mockPosition]);
      });

      mockSelectedAddress = '0x2222222222222222222222222222222222222222';
      rerender(undefined);
      expect(result.current.positions).toEqual([]);
      expect(result.current.isInitialLoading).toBe(true);

      // Account switch: receive null (clearCache)
      act(() => {
        capturedCallback(null);
      });

      expect(result.current.isInitialLoading).toBe(true);
      expect(result.current.positions).toEqual([]);

      // New account data arrives
      const newAccountPositions: Position[] = [
        { ...mockPosition, symbol: 'ETH-PERP', size: '5.0' },
      ];

      act(() => {
        capturedCallback(newAccountPositions);
      });

      await waitFor(() => {
        expect(result.current.isInitialLoading).toBe(false);
        expect(result.current.positions).toEqual(newAccountPositions);
      });
    });

    it('replaces entire positions array on each update', async () => {
      let capturedCallback: (positions: Position[]) => void = jest.fn();
      mockPositionsSubscribe.mockImplementation((params) => {
        capturedCallback = params.callback;
        return jest.fn();
      });
      mockPricesSubscribe.mockReturnValue(jest.fn());

      const { result } = renderHook(() => usePerpsLivePositions());

      const firstPositions: Position[] = [mockPosition];
      act(() => {
        capturedCallback(firstPositions);
      });

      await waitFor(() => {
        expect(result.current).toEqual({
          positions: firstPositions,
          isInitialLoading: false,
          deliveryRevision: 0,
          prices: {},
        });
      });

      const secondPositions: Position[] = [
        { ...mockPosition, symbol: 'ETH-PERP', size: '5.0' },
        { ...mockPosition, symbol: 'SOL-PERP', size: '20.0' },
      ];

      act(() => {
        capturedCallback(secondPositions);
      });

      await waitFor(() => {
        expect(result.current).toEqual({
          positions: secondPositions,
          isInitialLoading: false,
          deliveryRevision: 0,
          prices: {},
        });
        expect(result.current.positions).not.toContain(mockPosition);
      });
    });
  });

  describe('Live prices', () => {
    it('keeps the controller PnL, RoE and value when price updates arrive', async () => {
      let positionsCallback: (positions: Position[]) => void = jest.fn();
      let pricesCallback: (prices: Record<string, PriceUpdate>) => void =
        jest.fn();

      mockPositionsSubscribe.mockImplementation((params) => {
        positionsCallback = params.callback;
        return jest.fn();
      });

      mockPricesSubscribeToSymbols.mockImplementation((params) => {
        pricesCallback = params.callback;
        return jest.fn();
      });

      const { result } = renderHook(() =>
        usePerpsLivePositions({ useLivePnl: true }),
      );

      const position: Position = {
        ...mockPosition,
        entryPrice: '50000',
        size: '1.0',
        marginUsed: '5000',
      };

      act(() => {
        positionsCallback([position]);
      });

      const priceUpdate: Record<string, PriceUpdate> = {
        'BTC-PERP': {
          symbol: 'BTC-PERP',
          price: '52000',
          markPrice: '52000',
          timestamp: Date.now(),
          isTradable: true,
        },
      };

      act(() => {
        pricesCallback(priceUpdate);
      });

      await waitFor(() => {
        expect(result.current.prices?.['BTC-PERP']?.price).toBe('52000');
      });
      // The controller's position figures are used as delivered.
      expect(result.current.positions[0]).toBe(position);
      expect(result.current.positions[0].unrealizedPnl).toBe('1000');
      expect(result.current.positions[0].returnOnEquity).toBe('20');
      expect(result.current.positions[0].positionValue).toBe('50000');
    });

    it('resets stale prices when an empty {} payload is received (cache-clear / reconnect)', async () => {
      // Arrange: PriceStreamChannel.clearCache() notifies subscribers with {}
      // on reconnect, provider change, or account switch. Without a reset, the
      // previous mark prices linger until every symbol receives a fresh tick.
      let positionsCallback: (positions: Position[]) => void = jest.fn();
      let pricesCallback: (prices: Record<string, PriceUpdate>) => void =
        jest.fn();

      mockPositionsSubscribe.mockImplementation((params) => {
        positionsCallback = params.callback;
        return jest.fn();
      });
      mockPricesSubscribeToSymbols.mockImplementation((params) => {
        pricesCallback = params.callback;
        return jest.fn();
      });

      const { result } = renderHook(() =>
        usePerpsLivePositions({ useLivePnl: true }),
      );

      const position: Position = {
        ...mockPosition,
        symbol: 'BTC-PERP',
        entryPrice: '50000',
        size: '1.0',
        marginUsed: '5000',
        unrealizedPnl: '1000',
        returnOnEquity: '0.2',
      };

      act(() => {
        positionsCallback([position]);
      });

      act(() => {
        pricesCallback({
          'BTC-PERP': {
            symbol: 'BTC-PERP',
            price: '51000',
            markPrice: '51000',
            timestamp: Date.now(),
            isTradable: true,
          },
        });
      });

      await waitFor(() => {
        expect(result.current.prices?.['BTC-PERP']?.price).toBe('51000');
      });

      // Act: cache-clear fires and the channel emits {}
      act(() => {
        pricesCallback({});
      });

      // Assert
      await waitFor(() => {
        expect(result.current.prices).toEqual({});
      });
      expect(result.current.positions[0]).toBe(position);
      expect(result.current.positions[0].unrealizedPnl).toBe('1000');
      expect(result.current.positions[0].returnOnEquity).toBe('0.2');
      expect(result.current.positions[0].positionValue).toBe('50000');
    });

    it('merges partial price ticks so a tick for one symbol does not wipe another (multi-position portfolio)', async () => {
      // Arrange
      let positionsCallback: (positions: Position[]) => void = jest.fn();
      let pricesCallback: (prices: Record<string, PriceUpdate>) => void =
        jest.fn();

      mockPositionsSubscribe.mockImplementation((params) => {
        positionsCallback = params.callback;
        return jest.fn();
      });
      mockPricesSubscribeToSymbols.mockImplementation((params) => {
        pricesCallback = params.callback;
        return jest.fn();
      });

      const { result } = renderHook(() =>
        usePerpsLivePositions({ useLivePnl: true }),
      );

      const btc: Position = {
        ...mockPosition,
        symbol: 'BTC-PERP',
        entryPrice: '50000',
        size: '1.0',
        marginUsed: '5000',
      };
      const eth: Position = {
        ...mockPosition,
        symbol: 'ETH-PERP',
        entryPrice: '2000',
        size: '10.0',
        marginUsed: '2000',
      };

      act(() => {
        positionsCallback([btc, eth]);
      });

      // First tick: full batch with prices for BOTH symbols
      act(() => {
        pricesCallback({
          'BTC-PERP': {
            symbol: 'BTC-PERP',
            price: '52000',
            markPrice: '52000',
            timestamp: Date.now(),
            isTradable: true,
          },
          'ETH-PERP': {
            symbol: 'ETH-PERP',
            price: '2200',
            markPrice: '2200',
            timestamp: Date.now(),
            isTradable: true,
          },
        });
      });

      await waitFor(() => {
        expect(result.current.prices?.['ETH-PERP']?.price).toBe('2200');
      });

      // Act: partial batch with only BTC updated
      act(() => {
        pricesCallback({
          'BTC-PERP': {
            symbol: 'BTC-PERP',
            price: '53000',
            markPrice: '53000',
            timestamp: Date.now(),
            isTradable: true,
          },
        });
      });

      // Assert: BTC takes the new price, ETH keeps its merged price
      await waitFor(() => {
        expect(result.current.prices?.['BTC-PERP']?.price).toBe('53000');
      });
      expect(result.current.prices?.['ETH-PERP']?.price).toBe('2200');
      expect(result.current.positions).toEqual([btc, eth]);
      expect(result.current.positions[0].unrealizedPnl).toBe('1000');
      expect(result.current.positions[1].unrealizedPnl).toBe('1000');
    });
  });

  describe('initial state from cache', () => {
    it('seeds positions from the channel snapshot before controller cache', () => {
      const channelPositions: Position[] = [
        { ...mockPosition, symbol: 'BTC-PERP', size: '2.0' },
        { ...mockPosition, symbol: 'SOL-PERP', size: '3.0' },
      ];

      mockChannelPositionsSnapshot = channelPositions;
      mockCachedUserData = null;
      mockPositionsSubscribe.mockReturnValue(jest.fn());
      mockPricesSubscribe.mockReturnValue(jest.fn());

      const { result } = renderHook(() => usePerpsLivePositions());

      expect(result.current.positions).toEqual(channelPositions);
      expect(result.current.isInitialLoading).toBe(false);
    });

    it('seeds positions from cache when fresh cached data exists', () => {
      const cachedPositions: Position[] = [
        { ...mockPosition, symbol: 'BTC-PERP', size: '2.0' },
        { ...mockPosition, symbol: 'ETH-PERP', size: '10.0' },
      ];

      mockCachedUserData = {
        positions: cachedPositions,
        orders: [],
        accountState: null,
      };

      mockPositionsSubscribe.mockReturnValue(jest.fn());
      mockPricesSubscribe.mockReturnValue(jest.fn());

      const { result } = renderHook(() => usePerpsLivePositions());

      expect(result.current.positions).toEqual(cachedPositions);
      expect(result.current.isInitialLoading).toBe(false);
    });

    it('returns empty positions for stale cache (helper returns null)', () => {
      mockCachedUserData = null;

      mockPositionsSubscribe.mockReturnValue(jest.fn());
      mockPricesSubscribe.mockReturnValue(jest.fn());

      const { result } = renderHook(() => usePerpsLivePositions());

      expect(result.current.positions).toEqual([]);
      expect(result.current.isInitialLoading).toBe(true);
    });

    it('returns empty positions when no cache exists', () => {
      mockCachedUserData = null;

      mockPositionsSubscribe.mockReturnValue(jest.fn());
      mockPricesSubscribe.mockReturnValue(jest.fn());

      const { result } = renderHook(() => usePerpsLivePositions());

      expect(result.current.positions).toEqual([]);
      expect(result.current.isInitialLoading).toBe(true);
    });

    it('handles empty cached positions array (valid cache, no positions)', () => {
      mockCachedUserData = { positions: [], orders: [], accountState: null };

      mockPositionsSubscribe.mockReturnValue(jest.fn());
      mockPricesSubscribe.mockReturnValue(jest.fn());

      const { result } = renderHook(() => usePerpsLivePositions());

      expect(result.current.positions).toEqual([]);
      expect(result.current.isInitialLoading).toBe(false);
    });
  });

  describe('TAT-2236: no button flash on first WebSocket update', () => {
    it('positions are available synchronously when isInitialLoading becomes false', () => {
      // This test verifies the fix for TAT-2236: when the first WebSocket update
      // arrives, positions must be resolved in the SAME render as isInitialLoading
      // becoming false. If positions lag by one render, the market detail view
      // briefly shows Long/Short buttons before switching to Modify/Close.
      let capturedCallback: (positions: Position[] | null) => void = jest.fn();
      mockPositionsSubscribe.mockImplementation((params) => {
        capturedCallback = params.callback;
        return jest.fn();
      });
      mockPricesSubscribe.mockReturnValue(jest.fn());

      const { result } = renderHook(() => usePerpsLivePositions());

      // Initially loading with no positions
      expect(result.current.isInitialLoading).toBe(true);
      expect(result.current.positions).toEqual([]);

      // Simulate first WebSocket update with positions
      act(() => {
        capturedCallback([mockPosition]);
      });

      // CRITICAL: Both isInitialLoading=false AND positions must be set
      // in the same render — no intermediate state allowed
      expect(result.current.isInitialLoading).toBe(false);
      expect(result.current.positions).toEqual([mockPosition]);
      expect(result.current.positions.length).toBe(1);
    });
  });
});
