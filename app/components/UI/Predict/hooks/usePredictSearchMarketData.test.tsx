import { renderHook, waitFor } from '@testing-library/react-native';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { POLYMARKET_PROVIDER_ID } from '../providers/polymarket/constants';
import { PredictMarket, Recurrence } from '../types';
import { usePredictSearchMarketData } from './usePredictSearchMarketData';

jest.mock('../../../../core/SDKConnect/utils/DevLogger');

const mockGetMarkets = jest.fn();
const mockSearchMarkets = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getMarkets: (...args: unknown[]) => mockGetMarkets(...args),
      searchMarkets: (...args: unknown[]) => mockSearchMarkets(...args),
    },
  },
}));

const mockMarketData: PredictMarket[] = [
  {
    id: 'market-1',
    providerId: POLYMARKET_PROVIDER_ID,
    slug: 'bitcoin-price-prediction',
    title: 'Will Bitcoin reach $100k by end of 2024?',
    description: 'Bitcoin price prediction market',
    image: 'https://example.com/btc.png',
    status: 'open',
    recurrence: Recurrence.NONE,
    category: 'crypto',
    tags: ['trending'],
    outcomes: [],
    liquidity: 1000000,
    volume: 1000000,
  },
];

describe('usePredictSearchMarketData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (DevLogger.log as jest.Mock).mockImplementation(() => undefined);
    mockGetMarkets.mockResolvedValue({
      markets: mockMarketData,
      nextCursor: null,
    });
    mockSearchMarkets.mockResolvedValue(mockMarketData);
  });

  it('does not fetch when disabled', () => {
    renderHook(() => usePredictSearchMarketData({ q: '', enabled: false }));

    expect(mockGetMarkets).not.toHaveBeenCalled();
    expect(mockSearchMarkets).not.toHaveBeenCalled();
  });

  it('fetches trending markets for an empty query', async () => {
    const { result } = renderHook(() => usePredictSearchMarketData({ q: '' }));

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(mockGetMarkets).toHaveBeenCalledWith({
      category: 'trending',
      limit: 20,
    });
    expect(mockSearchMarkets).not.toHaveBeenCalled();
    expect(result.current.marketData).toEqual(mockMarketData);
  });

  it('trims and searches non-empty queries', async () => {
    const { result } = renderHook(() =>
      usePredictSearchMarketData({ q: ' bitcoin ', pageSize: 10 }),
    );

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(mockSearchMarkets).toHaveBeenCalledWith({
      q: 'bitcoin',
      limit: 10,
      page: 1,
    });
    expect(mockGetMarkets).not.toHaveBeenCalled();
    expect(result.current.marketData).toEqual(mockMarketData);
  });

  it('sets error and clears data when search throws', async () => {
    mockSearchMarkets.mockRejectedValue(new Error('Search failed'));

    const { result } = renderHook(() =>
      usePredictSearchMarketData({ q: 'bitcoin' }),
    );

    await waitFor(() => expect(result.current.isFetching).toBe(false), {
      timeout: 7000,
    });

    expect(result.current.error).toBe('Search failed');
    expect(result.current.marketData).toEqual([]);
  });
});
