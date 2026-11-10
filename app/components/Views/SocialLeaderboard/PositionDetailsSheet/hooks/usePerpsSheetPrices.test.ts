import { renderHook, waitFor } from '@testing-library/react-native';
import { fetchHyperliquidHistoricalPrices } from '../../utils/hyperliquidPrices';
import { NOW_MS } from '../positionDetailsSheet.fixtures';
import { usePerpsSheetPrices } from './usePerpsSheetPrices';

jest.mock('../../utils/hyperliquidPrices', () => ({
  fetchHyperliquidHistoricalPrices: jest.fn(),
}));

const mockFetch = jest.mocked(fetchHyperliquidHistoricalPrices);

describe('usePerpsSheetPrices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches the selected period and no other range', async () => {
    mockFetch.mockResolvedValue([['1', 100]]);

    const { result } = renderHook(() =>
      usePerpsSheetPrices({
        symbol: 'BTC',
        period: '1D',
        nowMs: NOW_MS,
        enabled: true,
      }),
    );

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.prices).toEqual([['1', 100]]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith({
      symbol: 'BTC',
      interval: '15m',
      limit: 96,
      nowMs: NOW_MS,
    });
  });

  it('clears prices when the candle fetch rejects', async () => {
    mockFetch.mockRejectedValue(new Error('network'));

    const { result } = renderHook(() =>
      usePerpsSheetPrices({
        symbol: 'BTC',
        period: '1W',
        nowMs: NOW_MS,
        enabled: true,
      }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.prices).toEqual([]);
  });

  it('drops the previous candles as soon as the period changes', async () => {
    let resolveFetch: (prices: [string, number][]) => void = () => undefined;
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const { result, rerender } = renderHook(
      ({ period }: { period: 'All' | '1D' }) =>
        usePerpsSheetPrices({
          symbol: 'BTC',
          period,
          nowMs: NOW_MS,
          enabled: true,
        }),
      { initialProps: { period: 'All' } },
    );

    resolveFetch([['1', 100]]);
    await waitFor(() => expect(result.current.prices).toEqual([['1', 100]]));

    rerender({ period: '1D' });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.prices).toEqual([]);
  });

  it('does nothing while disabled', () => {
    const { result } = renderHook(() =>
      usePerpsSheetPrices({
        symbol: 'BTC',
        period: '1D',
        nowMs: NOW_MS,
        enabled: false,
      }),
    );

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current).toEqual({ prices: [], isLoading: false });
  });
});
