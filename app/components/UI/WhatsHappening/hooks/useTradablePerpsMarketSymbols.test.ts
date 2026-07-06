import { renderHook } from '@testing-library/react-native';
import { useTradablePerpsMarketSymbols } from './useTradablePerpsMarketSymbols';

const mockUsePerpsMarkets = jest.fn();

jest.mock('../../Perps/hooks/usePerpsMarkets', () => ({
  usePerpsMarkets: (...args: unknown[]) => mockUsePerpsMarkets(...args),
}));

const makeMarket = (symbol: string) => ({
  symbol,
  name: symbol,
  maxLeverage: '10x',
  price: '$1.00',
  change24h: '+1%',
  change24hPercent: '1',
  volume: '$1M',
  openInterest: '$500K',
  volumeNumber: 1_000_000,
});

describe('useTradablePerpsMarketSymbols', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty set and isLoading true while markets are loading', () => {
    mockUsePerpsMarkets.mockReturnValue({ markets: [], isLoading: true });

    const { result } = renderHook(() => useTradablePerpsMarketSymbols());

    expect(result.current.tradableSymbols.size).toBe(0);
    expect(result.current.isLoading).toBe(true);
  });

  it('returns a set of symbol strings from the guardrail-filtered market list', () => {
    mockUsePerpsMarkets.mockReturnValue({
      markets: [makeMarket('BTC'), makeMarket('ETH'), makeMarket('xyz:TSLA')],
      isLoading: false,
    });

    const { result } = renderHook(() => useTradablePerpsMarketSymbols());

    expect(result.current.tradableSymbols).toEqual(
      new Set(['BTC', 'ETH', 'xyz:TSLA']),
    );
    expect(result.current.isLoading).toBe(false);
  });

  it('returns an empty set when the market list is empty (no tradable markets)', () => {
    mockUsePerpsMarkets.mockReturnValue({ markets: [], isLoading: false });

    const { result } = renderHook(() => useTradablePerpsMarketSymbols());

    expect(result.current.tradableSymbols.size).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  it('passes no arguments to usePerpsMarkets (relies on its showZeroVolume default)', () => {
    mockUsePerpsMarkets.mockReturnValue({ markets: [], isLoading: false });

    renderHook(() => useTradablePerpsMarketSymbols());

    expect(mockUsePerpsMarkets).toHaveBeenCalledWith();
  });
});
