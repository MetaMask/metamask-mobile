import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { POLYMARKET_PROVIDER_ID } from '../providers/polymarket/constants';
import { PredictMarket, Recurrence } from '../types';
import { usePredictSearchMarketData } from './usePredictSearchMarketData';

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

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

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
    logger: {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

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
    outcomes: [
      {
        id: 'outcome-1',
        providerId: POLYMARKET_PROVIDER_ID,
        marketId: 'market-1',
        title: 'Yes',
        description: 'Bitcoin will reach $100k',
        image: '',
        status: 'open',
        tokens: [{ id: 'token-1', title: 'Yes', price: 0.65 }],
        volume: 1000000,
        groupItemTitle: 'Yes',
      },
    ],
    liquidity: 1000000,
    volume: 1000000,
  },
];

describe('usePredictSearchMarketData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMarkets.mockResolvedValue({
      markets: mockMarketData,
      nextCursor: null,
    });
    mockSearchMarkets.mockResolvedValue(mockMarketData);
  });

  it('does not fetch when disabled', () => {
    const { Wrapper } = createWrapper();
    renderHook(() => usePredictSearchMarketData({ q: '', enabled: false }), {
      wrapper: Wrapper,
    });

    expect(mockGetMarkets).not.toHaveBeenCalled();
    expect(mockSearchMarkets).not.toHaveBeenCalled();
  });

  it('fetches trending markets for an empty query', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePredictSearchMarketData({ q: '' }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(mockGetMarkets).toHaveBeenCalledWith({
      category: 'trending',
      limit: 20,
    });
    expect(mockSearchMarkets).not.toHaveBeenCalled();
    expect(result.current.marketData).toEqual(mockMarketData);
  });

  it('trims and searches non-empty queries', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePredictSearchMarketData({ q: ' bitcoin ', pageSize: 10 }),
      { wrapper: Wrapper },
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

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePredictSearchMarketData({ q: 'bitcoin' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isFetching).toBe(false), {
      timeout: 7000,
    });

    expect(result.current.error).toBe('Search failed');
    expect(result.current.marketData).toEqual([]);
  });
});
