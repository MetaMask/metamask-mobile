import { renderHook, waitFor } from '@testing-library/react-native';
import {
  fetchHyperliquidHistoricalPrices,
  resolveHyperliquidCandleLimit,
} from '../../utils/hyperliquidPrices';
import { DAY_MS, NOW_MS } from '../positionDetailsSheet.fixtures';
import { usePerpsSheetPrices } from './usePerpsSheetPrices';

jest.mock('../../utils/hyperliquidPrices', () => ({
  fetchHyperliquidHistoricalPrices: jest.fn(),
  resolveHyperliquidCandleLimit: jest.fn(() => 240),
}));

const mockFetch = jest.mocked(fetchHyperliquidHistoricalPrices);
const mockResolveLimit = jest.mocked(resolveHyperliquidCandleLimit);

describe('usePerpsSheetPrices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches one hourly series reaching back to the first fill', async () => {
    mockFetch.mockResolvedValue([['1', 100]]);
    const earliestTradeMs = NOW_MS - 10 * DAY_MS;

    const { result } = renderHook(() =>
      usePerpsSheetPrices({
        symbol: 'BTC',
        earliestTradeMs,
        nowMs: NOW_MS,
        enabled: true,
      }),
    );

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.prices).toEqual([['1', 100]]);
    expect(mockResolveLimit).toHaveBeenCalledWith({
      interval: '1h',
      baseLimit: 168,
      earliestTradeMs,
      nowMs: NOW_MS,
    });
    expect(mockFetch).toHaveBeenCalledWith({
      symbol: 'BTC',
      interval: '1h',
      limit: 240,
      nowMs: NOW_MS,
    });
  });

  it('does nothing while disabled', () => {
    const { result } = renderHook(() =>
      usePerpsSheetPrices({
        symbol: 'BTC',
        earliestTradeMs: undefined,
        nowMs: NOW_MS,
        enabled: false,
      }),
    );

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current).toEqual({ prices: [], isLoading: false });
  });
});
