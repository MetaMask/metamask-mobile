import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import { useFeaturedCarouselData } from './useFeaturedCarouselData';
import { type PredictMarket, Recurrence } from '../types';

let mockUpDownEnabled = true;

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: () => mockUpDownEnabled,
}));

jest.mock('../../../../util/Logger');
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getCarouselMarkets: jest.fn(),
    },
  },
}));

const mockGetCarouselMarkets = Engine.context.PredictController
  .getCarouselMarkets as jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

const createMockMarket = (
  overrides: Partial<PredictMarket> = {},
): PredictMarket => ({
  id: 'market-1',
  providerId: 'polymarket',
  slug: 'btc-200k',
  title: 'Will BTC hit $200k?',
  description: 'BTC prediction',
  image: 'https://example.com/btc.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'crypto',
  tags: [],
  outcomes: [
    {
      id: 'outcome-1',
      providerId: 'polymarket',
      marketId: 'market-1',
      title: 'Yes',
      description: '',
      image: '',
      status: 'open',
      tokens: [{ id: 't1', title: 'Yes', price: 0.65 }],
      volume: 100000,
      groupItemTitle: 'Yes',
    },
  ],
  liquidity: 1500000,
  volume: 1500000,
  ...overrides,
});

describe('useFeaturedCarouselData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpDownEnabled = true;
  });

  it('returns loading state initially', () => {
    const { Wrapper } = createWrapper();
    mockGetCarouselMarkets.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useFeaturedCarouselData(), {
      wrapper: Wrapper,
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.markets).toHaveLength(0);
  });

  it('returns parsed markets after fetch', async () => {
    const { Wrapper } = createWrapper();
    const mockMarkets = [
      createMockMarket({ id: 'm1' }),
      createMockMarket({ id: 'm2' }),
    ];
    mockGetCarouselMarkets.mockResolvedValue(mockMarkets);

    const { result } = renderHook(() => useFeaturedCarouselData(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.markets).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('returns error when controller throws', async () => {
    const { Wrapper } = createWrapper();
    mockGetCarouselMarkets.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useFeaturedCarouselData(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.markets).toHaveLength(0);
  });

  it('returns empty markets when controller returns empty array', async () => {
    const { Wrapper } = createWrapper();
    mockGetCarouselMarkets.mockResolvedValue([]);

    const { result } = renderHook(() => useFeaturedCarouselData(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.markets).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  it('re-fetches data when refetch is called', async () => {
    const { Wrapper } = createWrapper();
    mockGetCarouselMarkets.mockResolvedValue([createMockMarket()]);

    const { result } = renderHook(() => useFeaturedCarouselData(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetCarouselMarkets).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockGetCarouselMarkets).toHaveBeenCalledTimes(2);
  });

  it('filters out crypto up/down markets when flag is disabled', async () => {
    mockUpDownEnabled = false;
    const { Wrapper } = createWrapper();
    const mockMarkets = [
      createMockMarket({ id: 'regular', tags: ['politics'] }),
      createMockMarket({
        id: 'updown',
        tags: ['up-or-down', 'crypto'],
        series: {
          id: 's1',
          slug: 'btc-weekly',
          title: 'BTC Weekly',
          recurrence: 'weekly',
        },
      }),
    ];
    mockGetCarouselMarkets.mockResolvedValue(mockMarkets);

    const { result } = renderHook(() => useFeaturedCarouselData(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.markets).toHaveLength(1);
    expect(result.current.markets[0].id).toBe('regular');
  });

  it('includes crypto up/down markets when flag is enabled', async () => {
    mockUpDownEnabled = true;
    const { Wrapper } = createWrapper();
    const mockMarkets = [
      createMockMarket({ id: 'regular', tags: ['politics'] }),
      createMockMarket({
        id: 'updown',
        tags: ['up-or-down', 'crypto'],
        series: {
          id: 's1',
          slug: 'btc-weekly',
          title: 'BTC Weekly',
          recurrence: 'weekly',
        },
      }),
    ];
    mockGetCarouselMarkets.mockResolvedValue(mockMarkets);

    const { result } = renderHook(() => useFeaturedCarouselData(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.markets).toHaveLength(2);
  });

  it('filters out sports markets with ended games', async () => {
    mockUpDownEnabled = true;
    const { Wrapper } = createWrapper();
    const mockMarkets = [
      createMockMarket({ id: 'active-market' }),
      createMockMarket({
        id: 'ended-game-market',
        game: {
          id: 'game-1',
          startTime: '2026-04-10T18:00:00Z',
          status: 'ended',
          league: 'epl',
          elapsed: null,
          period: null,
          score: null,
          homeTeam: {
            id: '1',
            name: 'Team A',
            logo: '',
            abbreviation: 'TA',
            color: 'rgb(0,0,0)',
          },
          awayTeam: {
            id: '2',
            name: 'Team B',
            logo: '',
            abbreviation: 'TB',
            color: 'rgb(255,255,255)',
          },
        },
      }),
      createMockMarket({
        id: 'live-game-market',
        game: {
          id: 'game-2',
          startTime: '2026-04-15T18:00:00Z',
          status: 'ongoing',
          league: 'epl',
          elapsed: '45',
          period: '1H',
          score: { away: 0, home: 1, raw: '0-1' },
          homeTeam: {
            id: '3',
            name: 'Team C',
            logo: '',
            abbreviation: 'TC',
            color: 'rgb(0,0,0)',
          },
          awayTeam: {
            id: '4',
            name: 'Team D',
            logo: '',
            abbreviation: 'TD',
            color: 'rgb(255,255,255)',
          },
        },
      }),
    ];
    mockGetCarouselMarkets.mockResolvedValue(mockMarkets);

    const { result } = renderHook(() => useFeaturedCarouselData(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.markets).toHaveLength(2);
    expect(result.current.markets.map((m) => m.id)).toEqual([
      'active-market',
      'live-game-market',
    ]);
  });
});
