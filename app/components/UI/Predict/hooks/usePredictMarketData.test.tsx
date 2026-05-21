import {
  renderHook,
  act,
  waitFor,
  cleanup,
} from '@testing-library/react-native';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import { usePredictMarketData } from './usePredictMarketData';
import { PredictMarket, PredictOutcome, Recurrence } from '../types';

import { POLYMARKET_PROVIDER_ID } from '../providers/polymarket/constants';
// Mock dependencies
jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getMarkets: jest.fn(),
    },
  },
}));

describe('usePredictMarketData', () => {
  const mockGetMarkets = jest.fn();

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
          tokens: [
            {
              id: 'token-1',
              title: 'Yes',
              price: 0.65,
            },
          ],
          volume: 1000000,
          groupItemTitle: 'Yes/No',
        },
        {
          id: 'outcome-2',
          providerId: POLYMARKET_PROVIDER_ID,
          marketId: 'market-1',
          title: 'No',
          description: 'Bitcoin will not reach $100k',
          image: '',
          status: 'open',
          tokens: [
            {
              id: 'token-2',
              title: 'No',
              price: 0.35,
            },
          ],
          volume: 1000000,
          groupItemTitle: 'Yes/No',
        },
      ],
      liquidity: 1000000,
      volume: 1000000,
    },
    {
      id: 'market-2',
      providerId: POLYMARKET_PROVIDER_ID,
      slug: 'ethereum-price-prediction',
      title: 'Will Ethereum reach $100000 by end of 2025?',
      description: 'Ethereum price prediction market',
      image: 'https://example.com/eth.png',
      status: 'open',
      recurrence: Recurrence.NONE,
      category: 'crypto',
      tags: ['trending'],
      outcomes: [
        {
          id: 'outcome-3',
          providerId: POLYMARKET_PROVIDER_ID,
          marketId: 'market-2',
          title: 'Yes',
          description: 'Ethereum will reach $100k',
          image: '',
          status: 'open',
          tokens: [
            {
              id: 'token-3',
              title: 'Yes',
              price: 0.45,
            },
          ],
          volume: 500000,
          groupItemTitle: 'Yes/No',
        },
        {
          id: 'outcome-4',
          providerId: POLYMARKET_PROVIDER_ID,
          marketId: 'market-2',
          title: 'No',
          description: 'Ethereum will not reach $100k',
          image: '',
          status: 'open',
          tokens: [
            {
              id: 'token-4',
              title: 'No',
              price: 0.55,
            },
          ],
          volume: 500000,
          groupItemTitle: 'Yes/No',
        },
      ],
      liquidity: 1000000,
      volume: 1000000,
    },
  ];

  const createOutcome = (id: string, price: number): PredictOutcome => ({
    ...mockMarketData[0].outcomes[0],
    id,
    title: id,
    tokens: [
      {
        ...mockMarketData[0].outcomes[0].tokens[0],
        id: `${id}-token`,
        price,
      },
    ],
  });

  const createMarket = (
    id: string,
    outcomes = [createOutcome(`${id}-outcome`, 0.5)],
    overrides: Partial<PredictMarket> = {},
  ): PredictMarket => ({
    ...mockMarketData[0],
    id,
    slug: id,
    title: id,
    outcomes,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Engine mocks
    (Engine.context.PredictController.getMarkets as jest.Mock) = mockGetMarkets;

    // Setup DevLogger mock
    (DevLogger.log as jest.Mock).mockImplementation(() => {
      // Mock implementation
    });
  });

  afterEach(async () => {
    // Force-unmount any hooks left over from the test so their pending
    // promises / state-setters don't leak into the next test (e.g. the
    // "marks fetching when enabled becomes true" case below uses a
    // never-resolving promise; without cleanup the hook stays mounted
    // and the worker can be force-killed by jest's watchdog under load,
    // showing up as an unrelated `waitFor` timeout in a sibling test).
    await act(async () => {
      cleanup();
    });
    jest.clearAllMocks();
  });

  it('does not fetch when enabled is false', () => {
    renderHook(() => usePredictMarketData({ enabled: false }));

    expect(mockGetMarkets).not.toHaveBeenCalled();
  });

  it('marks fetching when enabled becomes true before async fetch settles (no empty flash)', () => {
    mockGetMarkets.mockImplementation(
      () =>
        new Promise<{ markets: PredictMarket[]; nextCursor: string | null }>(
          (_resolve) => {
            /* unresolved until test ends */
          },
        ),
    );

    const { result, rerender, unmount } = renderHook(
      ({ enabled }: { enabled: boolean }) => usePredictMarketData({ enabled }),
      { initialProps: { enabled: false } },
    );

    expect(result.current.isFetching).toBe(false);

    rerender({ enabled: true });

    expect(result.current.isFetching).toBe(true);
    expect(result.current.marketData).toEqual([]);

    // Explicitly release the hook so the never-resolving promise above
    // doesn't keep an in-flight fetch alive across tests.
    unmount();
  });

  it('should fetch market data successfully', async () => {
    mockGetMarkets.mockResolvedValue({
      markets: mockMarketData,
      nextCursor: null,
    });

    const { result } = renderHook(() => usePredictMarketData());

    // Initially loading
    expect(result.current.isFetching).toBe(true);
    expect(result.current.marketData).toEqual([]);
    expect(result.current.error).toBe(null);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });
    expect(result.current.marketData).toEqual(mockMarketData);
    expect(result.current.error).toBe(null);
    expect(mockGetMarkets).toHaveBeenCalledTimes(1);
    expect(DevLogger.log).toHaveBeenCalledWith(
      'Fetching market data for category:',
      'trending',
      'hasAfterCursor:',
      false,
      'limit:',
      20,
    );
    expect(DevLogger.log).toHaveBeenCalledWith('Market data received:', {
      marketCount: mockMarketData.length,
      hasNextCursor: false,
    });
  });

  it('filters child more-market cards without disabling pagination', async () => {
    const rawMarkets = Array.from({ length: 20 }, (_, index) => ({
      ...mockMarketData[0],
      id: `market-${index}`,
      slug: `market-${index}`,
      parentMarketId: index >= 18 ? 'parent-market' : undefined,
    }));
    mockGetMarkets.mockResolvedValue({
      markets: rawMarkets,
      nextCursor: 'next-cursor',
    });

    const { result } = renderHook(() => usePredictMarketData({ pageSize: 20 }));

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(result.current.marketData).toHaveLength(18);
    expect(result.current.marketData.map((market) => market.id)).toEqual(
      rawMarkets.slice(0, 18).map((market) => market.id),
    );
    expect(result.current.hasMore).toBe(true);
  });

  it('filters stale markets and keeps pagination metadata unchanged', async () => {
    const staleMarket = createMarket('stale-market', [
      createOutcome('stale-high', 0.99),
      createOutcome('stale-low', 0.01),
    ]);
    const liveMarket = createMarket('live-market');
    const partialMarket = createMarket('partial-market', [
      createOutcome('partial-dead', 0.99),
      createOutcome('partial-live', 0.45),
    ]);
    mockGetMarkets.mockResolvedValue({
      markets: [staleMarket, liveMarket, partialMarket],
      nextCursor: 'next-cursor',
    });

    const { result } = renderHook(() => usePredictMarketData({ pageSize: 20 }));

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(result.current.marketData.map((market) => market.id)).toEqual([
      'live-market',
      'partial-market',
    ]);
    expect(result.current.marketData[1].outcomes).toEqual([
      createOutcome('partial-live', 0.45),
    ]);
    expect(result.current.hasMore).toBe(true);
  });

  it('keeps highlighted stale markets pinned before live markets', async () => {
    const liveMarket = createMarket('live-market');
    const highlightedMarket = createMarket(
      'highlighted-market',
      [createOutcome('highlighted-dead', 0.99)],
      { isHighlighted: true },
    );
    mockGetMarkets.mockResolvedValue({
      markets: [liveMarket, highlightedMarket],
      nextCursor: null,
    });

    const { result } = renderHook(() => usePredictMarketData());

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(result.current.marketData.map((market) => market.id)).toEqual([
      'highlighted-market',
      'live-market',
    ]);
    expect(result.current.marketData[0].outcomes).toEqual([
      createOutcome('highlighted-dead', 0.99),
    ]);
  });

  it('uses raw page offsets when loading more after child cards are filtered', async () => {
    const firstRawPage = Array.from({ length: 20 }, (_, index) => ({
      ...mockMarketData[0],
      id: `first-page-market-${index}`,
      slug: `first-page-market-${index}`,
      parentMarketId: index >= 18 ? 'parent-market' : undefined,
    }));
    const secondRawPage = Array.from({ length: 5 }, (_, index) => ({
      ...mockMarketData[0],
      id: `second-page-market-${index}`,
      slug: `second-page-market-${index}`,
    }));

    mockGetMarkets
      .mockResolvedValueOnce({ markets: firstRawPage, nextCursor: 'cursor-2' })
      .mockResolvedValueOnce({ markets: secondRawPage, nextCursor: null });

    const { result } = renderHook(() => usePredictMarketData({ pageSize: 20 }));

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    await act(async () => {
      await result.current.fetchMore();
    });

    expect(mockGetMarkets).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ limit: 20, afterCursor: 'cursor-2' }),
    );
    expect(result.current.marketData).toHaveLength(23);
    expect(result.current.hasMore).toBe(false);
  });

  it('handle null market data', async () => {
    mockGetMarkets.mockResolvedValue({ markets: null, nextCursor: null });

    const { result } = renderHook(() => usePredictMarketData());

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });
    expect(result.current.marketData).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('handle empty market data array', async () => {
    mockGetMarkets.mockResolvedValue({ markets: [], nextCursor: null });

    const { result } = renderHook(() => usePredictMarketData());

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });
    expect(result.current.marketData).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('refetch data when calling refetch', async () => {
    mockGetMarkets.mockResolvedValue({
      markets: mockMarketData,
      nextCursor: null,
    });

    const { result } = renderHook(() => usePredictMarketData());

    await waitFor(() => {
      expect(mockGetMarkets).toHaveBeenCalledTimes(1);
    });

    // Call refetch
    await act(async () => {
      await result.current.refetch();
    });

    expect(mockGetMarkets).toHaveBeenCalledTimes(2);
  });

  it('maintain stable refetch function reference', async () => {
    mockGetMarkets.mockResolvedValue({
      markets: mockMarketData,
      nextCursor: null,
    });

    const { result, rerender } = renderHook(() => usePredictMarketData());

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    const firstRefetch = result.current.refetch;

    // Trigger a re-render
    rerender(undefined);

    expect(result.current.refetch).toBe(firstRefetch);
  });

  describe('customQueryParams option', () => {
    it('passes customQueryParams to getMarkets', async () => {
      mockGetMarkets.mockResolvedValue({
        markets: mockMarketData,
        nextCursor: null,
      });

      const { result } = renderHook(() =>
        usePredictMarketData({
          category: 'hot',
          customQueryParams: 'tag_id=149&order=volume24hr',
        }),
      );

      await waitFor(() => {
        expect(mockGetMarkets).toHaveBeenCalledWith(
          expect.objectContaining({
            category: 'hot',
            customQueryParams: 'tag_id=149&order=volume24hr',
          }),
        );
        expect(result.current.isFetching).toBe(false);
      });
    });

    it('refetches when customQueryParams changes', async () => {
      mockGetMarkets.mockResolvedValue({
        markets: mockMarketData,
        nextCursor: null,
      });

      const { result, rerender } = renderHook(
        ({ customQueryParams }) =>
          usePredictMarketData({
            category: 'hot',
            customQueryParams,
          }),
        {
          initialProps: { customQueryParams: 'tag_id=149' },
        },
      );

      await waitFor(() => {
        expect(mockGetMarkets).toHaveBeenCalledTimes(1);
        expect(result.current.isFetching).toBe(false);
      });

      rerender({ customQueryParams: 'tag_id=200' });

      await waitFor(() => {
        expect(mockGetMarkets).toHaveBeenCalledTimes(2);
        expect(result.current.isFetching).toBe(false);
      });
      expect(mockGetMarkets).toHaveBeenLastCalledWith(
        expect.objectContaining({
          customQueryParams: 'tag_id=200',
        }),
      );
    });

    it('does not pass customQueryParams when undefined', async () => {
      mockGetMarkets.mockResolvedValue({
        markets: mockMarketData,
        nextCursor: null,
      });

      const { result } = renderHook(() =>
        usePredictMarketData({
          category: 'trending',
        }),
      );

      await waitFor(() => {
        expect(mockGetMarkets).toHaveBeenCalledWith(
          expect.objectContaining({
            category: 'trending',
            customQueryParams: undefined,
          }),
        );
        expect(result.current.isFetching).toBe(false);
      });
    });
  });
});
