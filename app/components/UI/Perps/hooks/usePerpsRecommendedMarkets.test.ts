import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePerpsRecommendedMarkets } from './usePerpsRecommendedMarkets';
import type { PerpsMarketData } from '@metamask/perps-controller';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => []),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const { useSelector } = jest.requireMock('react-redux');

const buildMarket = (symbol: string, volume: string = '$1M'): PerpsMarketData =>
  ({
    symbol,
    name: symbol,
    maxLeverage: '10x',
    price: '$100',
    change24h: '+$1',
    change24hPercent: '+1%',
    volume,
  }) as PerpsMarketData;

describe('usePerpsRecommendedMarkets', () => {
  const allMarkets = [
    buildMarket('BTC', '$10B'),
    buildMarket('ETH', '$5B'),
    buildMarket('SOL', '$2B'),
    buildMarket('DOGE', '$1B'),
    buildMarket('AVAX', '$800M'),
    buildMarket('LINK', '$500M'),
    buildMarket('ADA', '$300M'),
  ];

  const mockToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useSelector.mockReturnValue([]);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('returns top N recommended markets excluding watchlisted ones', async () => {
    useSelector.mockReturnValue(['BTC', 'ETH']);

    const { result } = renderHook(() =>
      usePerpsRecommendedMarkets(allMarkets, mockToggle),
    );

    // Wait for AsyncStorage load
    await act(async () => {
      await Promise.resolve();
    });

    const symbols = result.current.recommendedMarkets.map((m) => m.symbol);
    expect(symbols).not.toContain('BTC');
    expect(symbols).not.toContain('ETH');
    expect(symbols[0]).toBe('SOL');
    expect(result.current.recommendedMarkets.length).toBeLessThanOrEqual(5);
  });

  it('returns empty array when user has previously dismissed', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

    const { result } = renderHook(() =>
      usePerpsRecommendedMarkets(allMarkets, mockToggle),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.recommendedMarkets).toEqual([]);
    expect(result.current.hasUserDismissed).toBe(true);
  });

  it('sets hasUserDismissed and persists to AsyncStorage on dismiss', async () => {
    const { result } = renderHook(() =>
      usePerpsRecommendedMarkets(allMarkets, mockToggle),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.hasUserDismissed).toBe(false);

    act(() => {
      result.current.dismissMarket('SOL');
    });

    expect(result.current.hasUserDismissed).toBe(true);
    expect(result.current.recommendedMarkets).toEqual([]);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@perps/dismissedRecommendations',
      'true',
    );
  });

  it('calls onToggleWatchlist when addToWatchlist is called', async () => {
    const { result } = renderHook(() =>
      usePerpsRecommendedMarkets(allMarkets, mockToggle),
    );

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.addToWatchlist('SOL');
    });

    expect(mockToggle).toHaveBeenCalledWith('SOL');
  });

  it('returns empty recommendations when all markets are watchlisted', async () => {
    useSelector.mockReturnValue(allMarkets.map((m) => m.symbol));

    const { result } = renderHook(() =>
      usePerpsRecommendedMarkets(allMarkets, mockToggle),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.recommendedMarkets).toEqual([]);
  });

  it('handles AsyncStorage read failure gracefully', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(
      new Error('read error'),
    );

    const { result } = renderHook(() =>
      usePerpsRecommendedMarkets(allMarkets, mockToggle),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.hasUserDismissed).toBe(false);
    expect(result.current.recommendedMarkets.length).toBeGreaterThan(0);
  });

  it('preserves volume ordering from allMarkets', async () => {
    const { result } = renderHook(() =>
      usePerpsRecommendedMarkets(allMarkets, mockToggle),
    );

    await act(async () => {
      await Promise.resolve();
    });

    const symbols = result.current.recommendedMarkets.map((m) => m.symbol);
    expect(symbols).toEqual(['BTC', 'ETH', 'SOL', 'DOGE', 'AVAX']);
  });
});
