import { renderHook, act } from '@testing-library/react-native';
import {
  PERPS_CONSTANTS,
  type PerpsMarketData,
  type PriceUpdate,
} from '@metamask/perps-controller';
import { usePerpsLiveMarket } from './usePerpsLiveMarket';

const mockSubscribeToSymbols = jest.fn();

jest.mock('../../providers/PerpsStreamManager', () => ({
  usePerpsStream: jest.fn(() => ({
    prices: {
      subscribeToSymbols: mockSubscribeToSymbols,
    },
  })),
}));

const makeMarket = (
  overrides: Partial<PerpsMarketData> = {},
): PerpsMarketData => ({
  symbol: 'BTC',
  name: 'Bitcoin',
  maxLeverage: '50x',
  price: '$52,000.00',
  change24h: '+$2,000',
  change24hPercent: '+4.00%',
  volume: '$2.5B',
  fundingRate: 0.0001,
  ...overrides,
});

describe('usePerpsLiveMarket', () => {
  let capturedCallback: (prices: Record<string, PriceUpdate>) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribeToSymbols.mockImplementation(({ callback }) => {
      capturedCallback = callback;
      return jest.fn();
    });
  });

  it('returns the original market object when there is no live data', () => {
    const market = makeMarket();
    const { result } = renderHook(() => usePerpsLiveMarket(market));

    expect(result.current).toBe(market);
  });

  it('subscribes to live prices for the market symbol with default throttle', () => {
    const market = makeMarket({ symbol: 'ETH' });
    renderHook(() => usePerpsLiveMarket(market));

    expect(mockSubscribeToSymbols).toHaveBeenCalledWith({
      symbols: ['ETH'],
      callback: expect.any(Function),
      throttleMs: 3000,
    });
  });

  it('respects a custom throttleMs option', () => {
    const market = makeMarket();
    renderHook(() => usePerpsLiveMarket(market, { throttleMs: 500 }));

    expect(mockSubscribeToSymbols).toHaveBeenCalledWith(
      expect.objectContaining({ throttleMs: 500 }),
    );
  });

  it('returns the original market by identity when price is unchanged and no funding change', () => {
    // '$52,000' is what formatPerpsFiat('52000', {minimumDecimals:2, maximumDecimals:2}) actually returns
    const market = makeMarket({ price: '$52,000' });
    const { result } = renderHook(() => usePerpsLiveMarket(market));

    act(() => {
      capturedCallback({
        BTC: { symbol: 'BTC', price: '52000.00', timestamp: 1 },
      });
    });

    expect(result.current).toBe(market);
  });

  it('updates price when live price differs from current price', () => {
    const market = makeMarket({ price: '$52,000.00' });
    const { result } = renderHook(() => usePerpsLiveMarket(market));

    act(() => {
      capturedCallback({
        BTC: { symbol: 'BTC', price: '55000', timestamp: 1 },
      });
    });

    expect(result.current).not.toBe(market);
    expect(result.current.price).toBe('$55,000');
  });

  it('updates change24hPercent and change24h when percentChange24h is provided', () => {
    const market = makeMarket();
    const { result } = renderHook(() => usePerpsLiveMarket(market));

    act(() => {
      capturedCallback({
        BTC: {
          symbol: 'BTC',
          price: '55000',
          percentChange24h: '5.77',
          timestamp: 1,
        },
      });
    });

    expect(result.current.change24hPercent).toBe('+5.77%');
    // change24h should be a non-empty formatted PnL string
    expect(result.current.change24h).toBeTruthy();
  });

  it('updates volume from live volume24h when positive', () => {
    const market = makeMarket();
    const { result } = renderHook(() => usePerpsLiveMarket(market));

    act(() => {
      capturedCallback({
        BTC: {
          symbol: 'BTC',
          price: '55000',
          volume24h: 3_000_000_000,
          timestamp: 1,
        },
      });
    });

    expect(result.current.volume).toBe('$3.00B');
  });

  it('sets volume to ZeroAmountDetailedDisplay when volume24h is 0', () => {
    const market = makeMarket();
    const { result } = renderHook(() => usePerpsLiveMarket(market));

    act(() => {
      capturedCallback({
        BTC: { symbol: 'BTC', price: '55000', volume24h: 0, timestamp: 1 },
      });
    });

    expect(result.current.volume).toBe(
      PERPS_CONSTANTS.ZeroAmountDetailedDisplay,
    );
  });

  it('falls back to FallbackPriceDisplay when volume24h is absent and original volume is empty', () => {
    const market = makeMarket({ volume: PERPS_CONSTANTS.ZeroAmountDisplay });
    const { result } = renderHook(() => usePerpsLiveMarket(market));

    act(() => {
      capturedCallback({
        BTC: { symbol: 'BTC', price: '55000', timestamp: 1 },
      });
    });

    expect(result.current.volume).toBe(PERPS_CONSTANTS.FallbackPriceDisplay);
  });

  it('updates funding rate from live data', () => {
    const market = makeMarket({ fundingRate: 0.0001 });
    const { result } = renderHook(() => usePerpsLiveMarket(market));

    act(() => {
      capturedCallback({
        BTC: { symbol: 'BTC', price: '55000', funding: 0.0005, timestamp: 1 },
      });
    });

    expect(result.current.fundingRate).toBe(0.0005);
  });

  it('triggers a new market object when only funding rate changes (price same)', () => {
    const market = makeMarket({ price: '$52,000', fundingRate: 0.0001 });
    const { result } = renderHook(() => usePerpsLiveMarket(market));

    act(() => {
      capturedCallback({
        BTC: {
          symbol: 'BTC',
          price: '52000.00',
          funding: 0.0012,
          timestamp: 1,
        },
      });
    });

    expect(result.current).not.toBe(market);
    expect(result.current.fundingRate).toBe(0.0012);
    expect(result.current.price).toBe('$52,000');
  });

  it('returns original market when funding rate is same and price is same', () => {
    const market = makeMarket({ price: '$52,000', fundingRate: 0.0005 });
    const { result } = renderHook(() => usePerpsLiveMarket(market));

    act(() => {
      capturedCallback({
        BTC: {
          symbol: 'BTC',
          price: '52000.00',
          funding: 0.0005,
          timestamp: 1,
        },
      });
    });

    expect(result.current).toBe(market);
  });

  it('handles -100% change (divisor = 0) without crashing', () => {
    const market = makeMarket();
    const { result } = renderHook(() => usePerpsLiveMarket(market));

    act(() => {
      capturedCallback({
        BTC: {
          symbol: 'BTC',
          price: '0.00',
          percentChange24h: '-100',
          volume24h: 0,
          timestamp: 1,
        },
      });
    });

    expect(result.current.change24hPercent).toBe('-100.00%');
    expect(result.current.volume).toBe(
      PERPS_CONSTANTS.ZeroAmountDetailedDisplay,
    );
  });
});
