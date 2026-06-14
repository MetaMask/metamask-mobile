import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  PredictMarketStatus,
  PredictPositionStatus,
  Recurrence,
  type PredictMarket,
  type PredictPosition,
} from '../types';
import { usePredictSeriesPositions } from './usePredictSeriesPositions';

const MOCK_ADDRESS = '0x1234567890123456789012345678901234567890';
const POLYMARKET_PROVIDER_ID = 'polymarket';

const mockGetMarket = jest.fn<Promise<PredictMarket | null>, [string]>();
jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PredictController: {
        getMarket: ({ marketId }: { marketId: string }) =>
          mockGetMarket(marketId),
      },
    },
  },
}));

const mockEnsurePolygonNetworkExists = jest.fn<Promise<void>, []>();
jest.mock('./usePredictNetworkManagement', () => ({
  usePredictNetworkManagement: () => ({
    ensurePolygonNetworkExists: mockEnsurePolygonNetworkExists,
  }),
}));

const mockGetEvmAccountFromSelectedAccountGroup = jest.fn(() => ({
  address: MOCK_ADDRESS,
  type: 'eip155:eoa',
}));
jest.mock('../utils/accounts', () => ({
  getEvmAccountFromSelectedAccountGroup: () =>
    mockGetEvmAccountFromSelectedAccountGroup(),
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupId: jest.fn(() => 'mock-account-group-id'),
  }),
);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: () => unknown) => selector(),
}));

jest.mock('./usePredictLivePositions', () => ({
  usePredictLivePositions: jest.fn(),
}));

const mockGetPositions = jest.fn<Promise<PredictPosition[]>, [unknown]>();
jest.mock('../queries', () => {
  const { queryOptions } = jest.requireActual('@tanstack/react-query');
  return {
    predictQueries: {
      positions: {
        keys: {
          all: () => ['predict', 'positions'] as const,
          byAddress: (address: string) =>
            ['predict', 'positions', address] as const,
        },
        options: ({ address }: { address: string }) => ({
          queryKey: ['predict', 'positions', address] as const,
          queryFn: () => mockGetPositions({ address }),
        }),
      },
      market: {
        keys: {
          all: () => ['predict', 'market'] as const,
          detail: (marketId: string) =>
            ['predict', 'market', marketId] as const,
        },
        options: ({ marketId }: { marketId: string }) =>
          queryOptions({
            queryKey: ['predict', 'market', marketId] as const,
            queryFn: () => mockGetMarket(marketId),
            staleTime: Infinity,
          }),
      },
    },
  };
});

jest.mock('../queries/market', () => {
  const { queryOptions } = jest.requireActual('@tanstack/react-query');
  return {
    predictMarketKeys: {
      all: () => ['predict', 'market'] as const,
      detail: (marketId: string) => ['predict', 'market', marketId] as const,
    },
    predictMarketOptions: ({ marketId }: { marketId: string }) =>
      queryOptions({
        queryKey: ['predict', 'market', marketId] as const,
        queryFn: () => mockGetMarket(marketId),
        staleTime: Infinity,
      }),
  };
});

const createPosition = (
  id: string,
  overrides: Partial<PredictPosition> = {},
): PredictPosition => ({
  id,
  providerId: POLYMARKET_PROVIDER_ID,
  marketId: `market-${id}`,
  outcomeId: `outcome-${id}`,
  outcome: 'Up',
  outcomeTokenId: `token-${id}`,
  currentValue: 100,
  title: `Position ${id}`,
  icon: 'icon',
  amount: 10,
  price: 0.7,
  status: PredictPositionStatus.OPEN,
  size: 10,
  outcomeIndex: 0,
  percentPnl: 12,
  cashPnl: 8,
  claimable: false,
  initialValue: 92,
  avgPrice: 0.6,
  endDate: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const createMarket = (
  id: string,
  seriesId: string,
  overrides: Partial<PredictMarket> = {},
): PredictMarket => ({
  id,
  providerId: POLYMARKET_PROVIDER_ID,
  slug: `market-${id}`,
  title: `Market ${id}`,
  description: 'desc',
  endDate: '2026-01-01T00:00:00.000Z',
  image: '',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'crypto',
  tags: ['crypto', 'up-or-down'],
  outcomes: [],
  liquidity: 100,
  volume: 200,
  series: {
    id: seriesId,
    slug: 'series-slug',
    title: 'Series Title',
    recurrence: '5m',
  },
  ...overrides,
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: Infinity } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return { Wrapper, queryClient };
};

describe('usePredictSeriesPositions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnsurePolygonNetworkExists.mockResolvedValue(undefined);
    mockGetPositions.mockResolvedValue([]);
    mockGetMarket.mockResolvedValue(null);
  });

  it('returns no rows when there are no positions', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => usePredictSeriesPositions({ seriesId: 'btc-5m' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.rows).toEqual([]);
  });

  it('returns no rows when seriesId is undefined', async () => {
    const { Wrapper } = createWrapper();
    mockGetPositions.mockResolvedValue([
      createPosition('a', { claimable: false }),
    ]);

    const { result } = renderHook(
      () => usePredictSeriesPositions({ seriesId: undefined }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.rows).toEqual([]);
    });
  });

  it('filters positions to those whose market belongs to the supplied series', async () => {
    const { Wrapper } = createWrapper();
    const fiveMinPosition = createPosition('5min', {
      marketId: 'market-5min',
      claimable: false,
    });
    const fifteenMinPosition = createPosition('15min', {
      marketId: 'market-15min',
      claimable: false,
    });
    mockGetPositions.mockResolvedValue([fiveMinPosition, fifteenMinPosition]);
    mockGetMarket.mockImplementation((marketId: string) => {
      if (marketId === 'market-5min') {
        return Promise.resolve(createMarket('market-5min', 'btc-5m-series'));
      }
      if (marketId === 'market-15min') {
        return Promise.resolve(createMarket('market-15min', 'btc-15m-series'));
      }
      return Promise.resolve(null);
    });

    const { result } = renderHook(
      () => usePredictSeriesPositions({ seriesId: 'btc-5m-series' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.rows).toHaveLength(1);
    });

    expect(result.current.rows[0].position.id).toBe('5min');
    expect(result.current.rows[0].marketStatus).toBe(PredictMarketStatus.OPEN);
  });

  it('includes claimable positions tagged as CLOSED so the UI can render won/lost states', async () => {
    const { Wrapper } = createWrapper();
    const activePosition = createPosition('active', {
      marketId: 'market-a',
      claimable: false,
    });
    const claimablePosition = createPosition('claimable', {
      marketId: 'market-b',
      claimable: true,
    });
    mockGetPositions.mockResolvedValue([activePosition, claimablePosition]);
    mockGetMarket.mockImplementation((marketId: string) =>
      Promise.resolve(createMarket(marketId, 'btc-5m-series')),
    );

    const { result } = renderHook(
      () => usePredictSeriesPositions({ seriesId: 'btc-5m-series' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.rows).toHaveLength(2);
    });

    const byPositionId = Object.fromEntries(
      result.current.rows.map((row) => [row.position.id, row]),
    );
    expect(byPositionId.active.marketStatus).toBe(PredictMarketStatus.OPEN);
    expect(byPositionId.claimable.marketStatus).toBe(
      PredictMarketStatus.CLOSED,
    );
  });

  it('uses the resolved market status for non-claimable positions', async () => {
    const { Wrapper } = createWrapper();
    const lostPosition = createPosition('lost', {
      marketId: 'market-lost',
      claimable: false,
    });
    mockGetPositions.mockResolvedValue([lostPosition]);
    mockGetMarket.mockResolvedValue(
      createMarket('market-lost', 'btc-5m-series', {
        status: PredictMarketStatus.CLOSED,
      }),
    );

    const { result } = renderHook(
      () => usePredictSeriesPositions({ seriesId: 'btc-5m-series' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.rows).toHaveLength(1);
    });

    expect(result.current.rows[0].marketStatus).toBe(
      PredictMarketStatus.CLOSED,
    );
  });

  it('skips fetching markets that are already in seedMarkets cache', async () => {
    const { Wrapper } = createWrapper();
    const seedMarket = createMarket('market-seed', 'btc-5m-series');
    const position = createPosition('seed-position', {
      marketId: 'market-seed',
      claimable: false,
    });
    mockGetPositions.mockResolvedValue([position]);

    const { result } = renderHook(
      () =>
        usePredictSeriesPositions({
          seriesId: 'btc-5m-series',
          seedMarkets: [seedMarket],
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.rows).toHaveLength(1);
    });

    expect(mockGetMarket).not.toHaveBeenCalledWith('market-seed');
  });

  it('excludes positions whose market detail cannot be resolved', async () => {
    const { Wrapper } = createWrapper();
    const orphanPosition = createPosition('orphan', {
      marketId: 'market-missing',
      claimable: false,
    });
    mockGetPositions.mockResolvedValue([orphanPosition]);
    mockGetMarket.mockResolvedValue(null);

    const { result } = renderHook(
      () => usePredictSeriesPositions({ seriesId: 'btc-5m-series' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.rows).toEqual([]);
  });
});
