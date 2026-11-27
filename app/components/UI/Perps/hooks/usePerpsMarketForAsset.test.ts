import { act, renderHook, waitFor } from '@testing-library/react-native';

// Mock DevLogger
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

// Mock usePerpsTrading hook
const mockGetMarkets = jest.fn();
jest.mock('./usePerpsTrading', () => ({
  usePerpsTrading: () => ({
    getMarkets: mockGetMarkets,
  }),
}));

// Mock usePerpsNetwork hook
jest.mock('./usePerpsNetwork', () => ({
  usePerpsNetwork: () => 'mainnet',
}));

// Import after mocks are set up
import {
  usePerpsMarketForAsset,
  _clearMarketExistenceCache,
} from './usePerpsMarketForAsset';

describe('usePerpsMarketForAsset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMarkets.mockReset();
    // Clear the module-level cache between tests
    _clearMarketExistenceCache();
  });

  it('returns loading=false and hasPerpsMarket=false for null symbol', () => {
    const { result } = renderHook(() => usePerpsMarketForAsset(null));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasPerpsMarket).toBe(false);
    expect(result.current.marketData).toBeNull();
  });

  it('returns loading=false and hasPerpsMarket=false for undefined symbol', () => {
    const { result } = renderHook(() => usePerpsMarketForAsset(undefined));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasPerpsMarket).toBe(false);
    expect(result.current.marketData).toBeNull();
  });

  it('returns hasPerpsMarket=true when market exists', async () => {
    mockGetMarkets.mockResolvedValue([{ name: 'ETH', maxLeverage: 40 }]);

    const { result } = renderHook(() => usePerpsMarketForAsset('eth'));

    await waitFor(() => {
      expect(result.current.hasPerpsMarket).toBe(true);
    });

    expect(result.current.marketData).toEqual({
      symbol: 'ETH',
      name: 'ETH',
      maxLeverage: '40x',
      marketSource: null,
      price: '',
      change24h: '',
      change24hPercent: '',
      volume: '',
    });
  });

  it('returns hasPerpsMarket=false when market not found', async () => {
    mockGetMarkets.mockResolvedValue([]);

    const { result } = renderHook(() => usePerpsMarketForAsset('UNKNOWN'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasPerpsMarket).toBe(false);
    expect(result.current.marketData).toBeNull();
  });

  it('normalizes symbol to uppercase for lookup', async () => {
    mockGetMarkets.mockResolvedValue([{ name: 'BTC', maxLeverage: 50 }]);

    const { result } = renderHook(() => usePerpsMarketForAsset('btc'));

    await waitFor(() => {
      expect(result.current.hasPerpsMarket).toBe(true);
    });

    expect(mockGetMarkets).toHaveBeenCalledWith({
      symbols: ['BTC'],
      standalone: true,
    });
  });

  it('calls getMarkets with standalone:true', async () => {
    mockGetMarkets.mockResolvedValue([]);

    renderHook(() => usePerpsMarketForAsset('DOGE'));

    await waitFor(() => {
      expect(mockGetMarkets).toHaveBeenCalledWith({
        symbols: ['DOGE'],
        standalone: true,
      });
    });
  });

  it('matches an RWA ticker against HIP-3 markets only', async () => {
    mockGetMarkets.mockResolvedValue([
      { name: 'MSFT', maxLeverage: 3 },
      { name: 'xyz:MSFT', maxLeverage: 10 },
    ]);

    const { result } = renderHook(() => usePerpsMarketForAsset('msft', true));

    await waitFor(() => {
      expect(result.current.hasPerpsMarket).toBe(true);
    });
    expect(mockGetMarkets).toHaveBeenCalledWith({ standalone: true });
    expect(result.current.marketData).toEqual({
      symbol: 'xyz:MSFT',
      name: 'xyz:MSFT',
      maxLeverage: '10x',
      marketSource: 'xyz',
      price: '',
      change24h: '',
      change24hPercent: '',
      volume: '',
    });
  });

  it('does not match HIP-3 markets for a token without rwaData', async () => {
    mockGetMarkets.mockResolvedValue([{ name: 'xyz:TSLA', maxLeverage: 10 }]);

    const { result } = renderHook(() => usePerpsMarketForAsset('TSLA'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.hasPerpsMarket).toBe(false);
  });

  it('handles errors gracefully', async () => {
    mockGetMarkets.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => usePerpsMarketForAsset('SOL'));

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });

    expect(result.current.hasPerpsMarket).toBe(false);
  });

  it('handles non-Error exceptions', async () => {
    mockGetMarkets.mockRejectedValue('Something went wrong');

    const { result } = renderHook(() => usePerpsMarketForAsset('AVAX'));

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to check perps market');
    });

    expect(result.current.hasPerpsMarket).toBe(false);
  });

  it('matches market by exact symbol name', async () => {
    mockGetMarkets.mockResolvedValue([
      { name: 'LINK', maxLeverage: 40 },
      { name: 'LINKCOIN', maxLeverage: 20 },
    ]);

    const { result } = renderHook(() => usePerpsMarketForAsset('LINK'));

    await waitFor(() => {
      expect(result.current.hasPerpsMarket).toBe(true);
    });

    expect(result.current.marketData?.name).toBe('LINK');
  });

  it('discards stale responses when symbol changes rapidly', async () => {
    // Clear cache to ensure fresh requests
    _clearMarketExistenceCache();

    // Slow response for first symbol (ETH)
    let resolveFirst: ((value: unknown) => void) | undefined;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    mockGetMarkets.mockImplementationOnce(async () => firstPromise);

    // Fast response for second symbol (BTC)
    mockGetMarkets.mockResolvedValueOnce([{ name: 'BTC', maxLeverage: 50 }]);

    const { result, rerender } = renderHook(
      ({ symbol }) => usePerpsMarketForAsset(symbol),
      { initialProps: { symbol: 'ETH' } },
    );

    // Change symbol before first request completes
    rerender({ symbol: 'BTC' });

    // Wait for BTC response
    await waitFor(() => {
      expect(result.current.marketData?.symbol).toBe('BTC');
    });

    // Now resolve the stale ETH response
    if (resolveFirst) {
      resolveFirst([{ name: 'ETH', maxLeverage: 40 }]);
    }

    // Wait a tick and verify still shows BTC (stale response was discarded)
    await waitFor(() => {
      expect(result.current.marketData?.symbol).toBe('BTC');
    });
    expect(result.current.hasPerpsMarket).toBe(true);
  });

  it('keeps a cached RWA match when a pending exact lookup resolves later', async () => {
    mockGetMarkets.mockResolvedValueOnce([
      { name: 'xyz:MSFT', maxLeverage: 10 },
    ]);
    const seeded = renderHook(() => usePerpsMarketForAsset('MSFT', true));
    await waitFor(() => {
      expect(seeded.result.current.hasPerpsMarket).toBe(true);
    });
    seeded.unmount();

    let resolveExact: ((value: unknown) => void) | undefined;
    mockGetMarkets.mockImplementationOnce(
      async () =>
        new Promise((resolve) => {
          resolveExact = resolve;
        }),
    );
    const { result, rerender } = renderHook(
      ({ isRwaAsset }) => usePerpsMarketForAsset('MSFT', isRwaAsset),
      { initialProps: { isRwaAsset: false } },
    );
    await waitFor(() => {
      expect(resolveExact).toBeDefined();
    });

    rerender({ isRwaAsset: true });
    await act(async () => {
      resolveExact?.([]);
    });

    expect(result.current.hasPerpsMarket).toBe(true);
    expect(result.current.marketData?.symbol).toBe('xyz:MSFT');
  });
});
