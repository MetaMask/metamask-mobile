import { act, renderHook } from '@testing-library/react-hooks';
import { CandlePeriod, PERPS_CONSTANTS } from '@metamask/perps-controller';
import { usePerpsMarketStats } from './usePerpsMarketStats';

let mockNetwork = 'testnet';
let mockProvider = 'hyperliquid';
let mockHip3ConfigVersion = 1;
let mockInitializedMarketContextKey: string | null = 'testnet|hyperliquid|1';

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: object) => unknown) => selector({}),
}));
jest.mock('../selectors/featureFlags', () => ({
  selectHip3ConfigVersion: () => mockHip3ConfigVersion,
}));
jest.mock('../selectors/perpsController', () => ({
  selectPerpsNetwork: () => mockNetwork,
  selectPerpsProvider: () => mockProvider,
}));
jest.mock('../services/PerpsConnectionManager', () => ({
  PerpsConnectionManager: {
    getInitializedMarketContextKey: () => mockInitializedMarketContextKey,
    subscribeToInitializedMarketContext: () => jest.fn(),
    getConnectionGeneration: () => 0,
    getInitializedConnectionGeneration: () => 0,
    subscribeToConnectionGeneration: () => jest.fn(),
    isSelectedUserContextReady: () => true,
    subscribeToInitializedUserContext: () => jest.fn(),
  },
}));

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      subscribeToPrices: jest.fn(),
    },
  },
}));

jest.mock('./usePerpsConnection', () => ({
  usePerpsConnection: jest.fn(() => ({ isInitialized: true })),
}));

// Mock the dependent hooks
jest.mock('./stream/usePerpsLiveCandles');

import Engine from '../../../../core/Engine';
import { usePerpsLiveCandles } from './stream/usePerpsLiveCandles';
import { usePerpsConnection } from './usePerpsConnection';

const mockedUsePerpsLiveCandles = jest.mocked(usePerpsLiveCandles);
const mockedUsePerpsConnection = jest.mocked(usePerpsConnection);
const mockSubscribeToPrices = Engine.context.PerpsController
  .subscribeToPrices as jest.Mock;

describe('usePerpsMarketStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockNetwork = 'testnet';
    mockProvider = 'hyperliquid';
    mockHip3ConfigVersion = 1;
    mockInitializedMarketContextKey = 'testnet|hyperliquid|1';
    mockedUsePerpsConnection.mockReturnValue({
      isInitialized: true,
      isConnected: true,
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      resetError: jest.fn(),
      reconnectWithNewContext: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Shared test data
  const mockPriceData = {
    BTC: {
      symbol: 'BTC',
      price: '45000.00',
      timestamp: Date.now(),
      percentChange24h: '2.50',
      funding: 0.01,
      // openInterest is now in USD (already converted from token units * price)
      // For example: 22,000 BTC * $45,000 = $990M
      openInterest: 990000000,
      volume24h: 1234567890,
    },
  };

  const mockCandleData = {
    symbol: 'BTC',
    interval: CandlePeriod.OneHour,
    candles: [
      {
        open: '44000',
        high: '46000',
        low: '43500',
        close: '45000',
        time: 1234567890,
        volume: '1000',
      },
      {
        open: '45000',
        high: '45500',
        low: '44500',
        close: '45200',
        time: 1234567891,
        volume: '1200',
      },
    ],
  };

  it('formats and displays all market statistics when data is available', () => {
    // Arrange: Set up market data with funding, volume, and open interest
    mockSubscribeToPrices.mockImplementation(({ callback }) => {
      callback([mockPriceData.BTC]);
      return jest.fn();
    });
    mockedUsePerpsLiveCandles.mockReturnValue({
      candleData: mockCandleData,
      isLoading: false,
      isLoadingMore: false,
      hasHistoricalData: true,
      error: null,
      fetchMoreHistory: jest.fn(),
    });

    // Act: Render the hook with a symbol
    const { result } = renderHook(() => usePerpsMarketStats('BTC'));

    // Assert: All market statistics are correctly formatted
    expect(result.current.currentPrice).toBe(45000);
    // PRICE_RANGES_UNIVERSAL: 5 sig figs, 0 decimals for $10k-$100k, trailing zeros removed
    expect(result.current.high24h).toBe('$46,000');
    expect(result.current.low24h).toBe('$43,500');
    expect(result.current.volume24h).toBe('$1.23B');
    expect(result.current.openInterest).toBe('$990.00M');
    expect(result.current.fundingRate).toBe('1.0000%');
    expect(result.current.isLoading).toBe(false);
  });

  it('indicates loading state when candle data is not yet available', () => {
    // Arrange: Set up state with no candle data
    mockSubscribeToPrices.mockImplementation(() => jest.fn());
    mockedUsePerpsLiveCandles.mockReturnValue({
      candleData: null,
      isLoading: true,
      isLoadingMore: false,
      hasHistoricalData: false,
      error: null,
      fetchMoreHistory: jest.fn(),
    });

    // Act: Render the hook
    const { result } = renderHook(() => usePerpsMarketStats('BTC'));

    // Assert: Loading state is true and default values are shown
    expect(result.current.isLoading).toBe(true);
    expect(result.current.currentPrice).toBe(0);
  });

  it('displays default values when no market data is available', () => {
    // Arrange: Set up empty market data state
    mockSubscribeToPrices.mockImplementation(() => jest.fn());
    mockedUsePerpsLiveCandles.mockReturnValue({
      candleData: null,
      isLoading: false,
      isLoadingMore: false,
      hasHistoricalData: false,
      error: null,
      fetchMoreHistory: jest.fn(),
    });

    // Act: Render the hook
    const { result } = renderHook(() => usePerpsMarketStats('BTC'));

    // Assert: All values show appropriate defaults
    expect(result.current.currentPrice).toBe(0);
    // PRICE_RANGES_UNIVERSAL: trailing zeros removed, so $0.00 → $0
    expect(result.current.high24h).toBe('$0');
    expect(result.current.low24h).toBe('$0');
    expect(result.current.volume24h).toBe(PERPS_CONSTANTS.FallbackPriceDisplay);
    expect(result.current.openInterest).toBe(
      PERPS_CONSTANTS.FallbackPriceDisplay,
    );
    expect(result.current.fundingRate).toBe('0.0000%');
  });

  it('formats extremely large numbers with appropriate suffixes', () => {
    // Given market data with very large volume and open interest values
    const largeNumberPriceData = {
      BTC: {
        ...mockPriceData.BTC,
        volume24h: 12345678901234,
        // openInterest is now in USD (already converted from token units * price)
        openInterest: 99000000000000, // $99T
      },
    };

    mockSubscribeToPrices.mockImplementation(({ callback }) => {
      callback([largeNumberPriceData.BTC]);
      return jest.fn();
    });

    mockedUsePerpsLiveCandles.mockReturnValue({
      candleData: mockCandleData,
      isLoading: false,
      isLoadingMore: false,
      hasHistoricalData: true,
      error: null,
      fetchMoreHistory: jest.fn(),
    });

    const { result } = renderHook(() => usePerpsMarketStats('BTC'));

    expect(result.current.volume24h).toBe('$12.35T'); // Decimals in formatVolume for detailed view
    expect(result.current.openInterest).toBe('$99.00T'); // Decimals in formatLargeNumber for detailed view
  });

  it('subscribes to prices only once when the first price tick arrives', () => {
    // Arrange: subscribe synchronously delivers a first price tick on subscribe
    const mockUnsubscribe = jest.fn();
    mockSubscribeToPrices.mockImplementation(({ callback }) => {
      callback([mockPriceData.BTC]);
      return mockUnsubscribe;
    });
    mockedUsePerpsLiveCandles.mockReturnValue({
      candleData: mockCandleData,
      isLoading: false,
      isLoadingMore: false,
      hasHistoricalData: true,
      error: null,
      fetchMoreHistory: jest.fn(),
    });

    // Act: Render the hook so the subscription effect runs and the first tick arrives
    renderHook(() => usePerpsMarketStats('BTC'));

    // Assert: capturing the initial price must not re-trigger the subscription effect
    expect(mockSubscribeToPrices).toHaveBeenCalledTimes(1);
    expect(mockUnsubscribe).not.toHaveBeenCalled();
  });

  it('does not combine prior-symbol stats with the first tick after a switch', () => {
    const callbacks = new Map<
      string,
      (updates: (typeof mockPriceData.BTC)[]) => void
    >();
    mockSubscribeToPrices.mockImplementation(({ symbols, callback }) => {
      callbacks.set(symbols[0], callback);
      return jest.fn();
    });
    mockedUsePerpsLiveCandles.mockImplementation(({ symbol }) => ({
      candleData: { ...mockCandleData, symbol },
      isLoading: false,
      isLoadingMore: false,
      hasHistoricalData: true,
      error: null,
      fetchMoreHistory: jest.fn(),
    }));

    const { result, rerender } = renderHook(
      ({ symbol }) => usePerpsMarketStats(symbol),
      { initialProps: { symbol: 'BTC' } },
    );

    act(() => {
      callbacks.get('BTC')?.([mockPriceData.BTC]);
    });
    expect(result.current.dataSymbol).toBe('BTC');
    expect(result.current.hasLiveData).toBe(true);

    rerender({ symbol: 'ETH' });
    expect(result.current.dataSymbol).toBeUndefined();
    expect(result.current.hasLiveData).toBe(false);

    act(() => {
      callbacks.get('ETH')?.([{ ...mockPriceData.BTC, symbol: 'ETH' }]);
    });
    expect(result.current.dataSymbol).toBe('ETH');
    expect(result.current.hasLiveData).toBe(true);
  });

  it.each([
    ['provider', () => (mockProvider = 'myx')],
    ['network', () => (mockNetwork = 'mainnet')],
    ['HIP-3 configuration', () => (mockHip3ConfigVersion = 2)],
  ])(
    'does not reuse same-symbol stats after a %s change',
    (_name, changeContext) => {
      const callbacks: ((updates: (typeof mockPriceData.BTC)[]) => void)[] = [];
      mockSubscribeToPrices.mockImplementation(({ callback }) => {
        callbacks.push(callback);
        return jest.fn();
      });
      mockedUsePerpsLiveCandles.mockReturnValue({
        candleData: mockCandleData,
        isLoading: false,
        isLoadingMore: false,
        hasHistoricalData: true,
        error: null,
        fetchMoreHistory: jest.fn(),
      });

      const { result, rerender } = renderHook(() => usePerpsMarketStats('BTC'));
      const connectionState = mockedUsePerpsConnection();
      act(() => callbacks[0]([mockPriceData.BTC]));
      expect(result.current.dataSymbol).toBe('BTC');

      changeContext();
      rerender();
      expect(result.current.dataSymbol).toBeUndefined();
      expect(result.current.hasLiveData).toBe(false);
      expect(callbacks).toHaveLength(1);

      act(() => callbacks[0]([mockPriceData.BTC]));
      expect(result.current.dataSymbol).toBeUndefined();

      mockedUsePerpsConnection.mockReturnValue({
        ...connectionState,
        isInitialized: false,
      });
      rerender();
      expect(callbacks).toHaveLength(1);

      mockInitializedMarketContextKey = `${mockNetwork}|${mockProvider}|${mockHip3ConfigVersion}`;
      mockedUsePerpsConnection.mockReturnValue({
        ...connectionState,
        isInitialized: true,
      });
      rerender();
      expect(callbacks).toHaveLength(2);

      act(() => callbacks[1]([mockPriceData.BTC]));
      expect(result.current.dataSymbol).toBe('BTC');
      expect(result.current.hasLiveData).toBe(true);
    },
  );

  it('keeps resident stats and restores the subscription after an account reconnect', () => {
    const callbacks: ((updates: (typeof mockPriceData.BTC)[]) => void)[] = [];
    mockSubscribeToPrices.mockImplementation(({ callback }) => {
      callbacks.push(callback);
      return jest.fn();
    });
    mockedUsePerpsLiveCandles.mockReturnValue({
      candleData: mockCandleData,
      isLoading: false,
      isLoadingMore: false,
      hasHistoricalData: true,
      error: null,
      fetchMoreHistory: jest.fn(),
    });

    const { result, rerender } = renderHook(() => usePerpsMarketStats('BTC'));
    const connectionState = mockedUsePerpsConnection();
    act(() => callbacks[0]([mockPriceData.BTC]));
    expect(result.current.dataSymbol).toBe('BTC');

    mockedUsePerpsConnection.mockReturnValue({
      ...connectionState,
      isInitialized: false,
    });
    rerender();
    expect(result.current.dataSymbol).toBe('BTC');
    expect(callbacks).toHaveLength(1);

    act(() => callbacks[0]([{ ...mockPriceData.BTC, volume24h: 1 }]));
    expect(result.current.volume24h).toBe('$1.23B');

    mockedUsePerpsConnection.mockReturnValue(connectionState);
    rerender();
    expect(callbacks).toHaveLength(2);

    act(() => callbacks[1]([{ ...mockPriceData.BTC, volume24h: 1 }]));
    expect(result.current.volume24h).toBe('$1');
  });

  it('formats negative funding rates with proper sign and decimals', () => {
    // Given a negative funding rate
    const negativeFundingData = {
      BTC: {
        ...mockPriceData.BTC,
        funding: -0.005,
      },
    };

    mockSubscribeToPrices.mockImplementation(({ callback }) => {
      callback([negativeFundingData.BTC]);
      return jest.fn();
    });

    mockedUsePerpsLiveCandles.mockReturnValue({
      candleData: mockCandleData,
      isLoading: false,
      isLoadingMore: false,
      hasHistoricalData: true,
      error: null,
      fetchMoreHistory: jest.fn(),
    });

    const { result } = renderHook(() => usePerpsMarketStats('BTC'));

    expect(result.current.fundingRate).toBe('-0.5000%');
  });

  it('displays formatted zero when volume and open interest are actually zero', () => {
    // Arrange: confirmed zero volume and open interest (not missing data)
    mockSubscribeToPrices.mockImplementation(({ callback }) => {
      callback([
        {
          ...mockPriceData.BTC,
          volume24h: 0,
          openInterest: 0,
        },
      ]);
      return jest.fn();
    });
    mockedUsePerpsLiveCandles.mockReturnValue({
      candleData: mockCandleData,
      isLoading: false,
      isLoadingMore: false,
      hasHistoricalData: true,
      error: null,
      fetchMoreHistory: jest.fn(),
    });

    // Act
    const { result } = renderHook(() => usePerpsMarketStats('BTC'));

    // Assert: actual zeros format as $0, not the missing-data placeholder
    expect(result.current.volume24h).toBe('$0');
    expect(result.current.openInterest).toBe('$0');
  });

  it('does not treat a current-symbol tick without stats as live data', () => {
    mockSubscribeToPrices.mockImplementation(({ callback }) => {
      callback([
        {
          symbol: 'BTC',
          price: '45000',
          timestamp: Date.now(),
        },
      ]);
      return jest.fn();
    });
    mockedUsePerpsLiveCandles.mockReturnValue({
      candleData: mockCandleData,
      isLoading: false,
      isLoadingMore: false,
      hasHistoricalData: true,
      error: null,
      fetchMoreHistory: jest.fn(),
    });

    const { result } = renderHook(() => usePerpsMarketStats('BTC'));

    expect(result.current.dataSymbol).toBe('BTC');
    expect(result.current.hasLiveData).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('does not subscribe until the Perps connection is initialized', () => {
    // Arrange: connection has not finished initializing
    mockedUsePerpsConnection.mockReturnValue({
      isInitialized: false,
      isConnected: false,
      isConnecting: true,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      resetError: jest.fn(),
      reconnectWithNewContext: jest.fn(),
    });
    mockedUsePerpsLiveCandles.mockReturnValue({
      candleData: mockCandleData,
      isLoading: false,
      isLoadingMore: false,
      hasHistoricalData: true,
      error: null,
      fetchMoreHistory: jest.fn(),
    });

    // Act
    renderHook(() => usePerpsMarketStats('BTC'));

    // Assert: subscribe is deferred until init so a fast Perps open can retry
    expect(mockSubscribeToPrices).not.toHaveBeenCalled();
  });

  it('exposes a terminal error when the market-data subscription fails', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    mockSubscribeToPrices.mockImplementation(() => {
      throw new Error('subscription failed');
    });
    mockedUsePerpsLiveCandles.mockReturnValue({
      candleData: mockCandleData,
      isLoading: false,
      isLoadingMore: false,
      hasHistoricalData: true,
      error: null,
      fetchMoreHistory: jest.fn(),
    });

    const { result } = renderHook(() => usePerpsMarketStats('BTC'));

    expect(result.current.hasError).toBe(true);
    consoleError.mockRestore();
  });

  it('subscribes after the Perps connection initializes', () => {
    // Arrange: start uninitialized, then flip to initialized
    mockedUsePerpsConnection.mockReturnValue({
      isInitialized: false,
      isConnected: false,
      isConnecting: true,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      resetError: jest.fn(),
      reconnectWithNewContext: jest.fn(),
    });
    mockedUsePerpsLiveCandles.mockReturnValue({
      candleData: mockCandleData,
      isLoading: false,
      isLoadingMore: false,
      hasHistoricalData: true,
      error: null,
      fetchMoreHistory: jest.fn(),
    });
    mockSubscribeToPrices.mockReturnValue(jest.fn());

    // Act: first render before init, then rerender after init
    const { rerender } = renderHook(() => usePerpsMarketStats('BTC'));

    expect(mockSubscribeToPrices).not.toHaveBeenCalled();

    mockedUsePerpsConnection.mockReturnValue({
      isInitialized: true,
      isConnected: true,
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      resetError: jest.fn(),
      reconnectWithNewContext: jest.fn(),
    });
    rerender();

    // Assert: subscribe retries once the client is ready
    expect(mockSubscribeToPrices).toHaveBeenCalledTimes(1);
    expect(mockSubscribeToPrices).toHaveBeenCalledWith(
      expect.objectContaining({
        symbols: ['BTC'],
        includeMarketData: true,
      }),
    );
  });
});
