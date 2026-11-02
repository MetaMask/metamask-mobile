import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import type { PredictActivity } from '../../Predict/types';
import { useActiveVenue } from '../implementation/activeVenue';
import { expectInactiveHookHasNoSideEffects } from '../implementation/inactiveHook.testUtils';
import type { ActiveVenueResolution } from '../implementation/types';
import { usePredictActivityItems } from './usePredictActivityItems';

const mockGetActivity = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getActivity: (...args: unknown[]) => mockGetActivity(...args),
    },
  },
}));

jest.mock('../../Predict/utils/accounts', () => ({
  getEvmAccountFromSelectedAccountGroup: () => ({
    address: '0x1234567890123456789012345678901234567890',
  }),
}));

const mockEnsurePolygonNetworkExists = jest.fn<Promise<void>, []>();
jest.mock('../../Predict/hooks/usePredictNetworkManagement', () => ({
  usePredictNetworkManagement: () => ({
    ensurePolygonNetworkExists: mockEnsurePolygonNetworkExists,
  }),
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

jest.mock('../implementation/activeVenue', () => ({
  useActiveVenue: jest.fn(),
}));

const buyActivity: PredictActivity = {
  id: 'predict-buy',
  providerId: 'polymarket',
  title: 'Will it rain?',
  outcome: 'Yes',
  entry: {
    type: 'buy',
    timestamp: 200,
    marketId: 'm1',
    outcomeId: 'o1',
    outcomeTokenId: 1,
    amount: 100,
    price: 0.42,
  },
};

const context = {
  eventId: 'KXNFLGAME-26OCT25KCBUF',
  eventTitle: 'Kansas City at Buffalo',
  marketQuestion: 'Kansas City to win?',
  outcomeLabel: 'Kansas City',
};

const trade = (id: string, action: 'buy' | 'sell', timestamp: string) => ({
  type: 'trade',
  venueId: 'kalshi',
  id,
  marketId: 'KXNFLGAME-26OCT25KCBUF-KC',
  side: 'yes',
  action,
  shares: '10',
  price: '0.61',
  amount: '5.93',
  fee: '0.17',
  ...(action === 'sell' ? { realizedPnl: '0.27' } : {}),
  timestamp,
  context,
});

const settlementEntry = {
  type: 'settlement',
  venueId: 'kalshi',
  id: 'settlement-1',
  marketId: 'KXNCAAFGAME-18OCT25UTAHBYU-UTAH',
  side: 'no',
  shares: '8',
  result: 'yes',
  proceeds: '0',
  realizedPnl: '-3.36',
  timestamp: '2026-10-19T04:12:00.000Z',
};

const firstPage = {
  venueId: 'kalshi',
  activity: [
    trade('trade-buy', 'buy', '2026-10-22T18:04:11.532Z'),
    trade('trade-sell', 'sell', '2026-10-21T18:04:11.532Z'),
    settlementEntry,
  ],
  nextCursor: 'page-2',
};

/** Repeats the boundary entry, as a page boundary must never do. */
const secondPage = {
  venueId: 'kalshi',
  activity: [
    settlementEntry,
    trade('trade-old', 'buy', '2026-10-18T16:30:02.118Z'),
  ],
};

const polymarketDeposit = {
  type: 'predictionsAddFunds',
  chainId: 'eip155:137',
  status: 'success',
  timestamp: 1,
  hash: '0xdeposit',
  data: {},
} as ActivityListItem;

const givenActiveVenue = (resolution: ActiveVenueResolution) =>
  jest.mocked(useActiveVenue).mockReturnValue(resolution);

/** Serves `PredictPortfolioService:getActivity` the way the data service
 * does: the query key's Venue and params, plus the page cursor. */
const mockGetCanonicalActivity = jest.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        queryFn: ({ queryKey, pageParam }) => {
          const [method, venueId, params] = queryKey as [
            string,
            string,
            unknown,
          ];
          if (method !== 'PredictPortfolioService:getActivity') {
            throw new Error(`Unexpected query ${method}`);
          }
          return mockGetCanonicalActivity(venueId, params, pageParam);
        },
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('usePredictActivityItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActivity.mockResolvedValue({
      activities: [buyActivity],
      nextCursor: undefined,
    });
    mockEnsurePolygonNetworkExists.mockResolvedValue(undefined);
  });

  describe('while the next implementation is active', () => {
    beforeEach(() => {
      givenActiveVenue({ status: 'ready', venue: 'kalshi', source: 'rollout' });
      mockGetCanonicalActivity.mockImplementation(
        (_venueId: string, _params: unknown, cursor?: string) =>
          Promise.resolve(cursor === 'page-2' ? secondPage : firstPage),
      );
    });

    it('never ensures Polygon or reads legacy Activity', async () => {
      await expectInactiveHookHasNoSideEffects({
        useInactiveHook: () => usePredictActivityItems({ enabled: true }),
        sideEffects: [mockEnsurePolygonNetworkExists, mockGetActivity],
        wrapper: createWrapper(),
      });
    });

    it('maps Trades and Settlements to USD venue rows with no chain', async () => {
      const { result } = renderHook(
        () => usePredictActivityItems({ enabled: true }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.items).toHaveLength(3));
      expect(mockGetCanonicalActivity).toHaveBeenCalledWith(
        'kalshi',
        { limit: 20 },
        undefined,
      );
      expect(result.current.items.map(({ type }) => type)).toEqual([
        'predictionPlaced',
        'predictionCashedOut',
        'predictionSettled',
      ]);
      for (const item of result.current.items) {
        expect(item).toMatchObject({
          chainId: 'kalshi:mainnet',
          status: 'success',
          data: { token: { symbol: 'USD' } },
        });
      }
      expect(result.current.items.map(({ hash }) => hash)).toEqual([
        'trade-buy',
        'trade-sell',
        'settlement-1',
      ]);
      expect(result.current).toMatchObject({
        isLoading: false,
        error: null,
        hasMore: true,
        isFetchingMore: false,
      });
    });

    it('loads the next page without repeating a row at the cursor boundary', async () => {
      const { result } = renderHook(
        () => usePredictActivityItems({ enabled: true }),
        { wrapper: createWrapper() },
      );
      await waitFor(() => expect(result.current.hasMore).toBe(true));
      const firstItems = result.current.items;

      await act(() => result.current.loadMore());

      await waitFor(() => expect(result.current.items).toHaveLength(4));
      expect(mockGetCanonicalActivity).toHaveBeenLastCalledWith(
        'kalshi',
        { limit: 20 },
        'page-2',
      );
      expect(result.current.items.map(({ hash }) => hash)).toEqual([
        'trade-buy',
        'trade-sell',
        'settlement-1',
        'trade-old',
      ]);
      expect(result.current.items.slice(0, 3)).toEqual(firstItems);
      expect(result.current.hasMore).toBe(false);
    });

    it('reports its own error without items', async () => {
      mockGetCanonicalActivity.mockRejectedValue(
        new Error('venue_unavailable'),
      );
      const { result } = renderHook(
        () => usePredictActivityItems({ enabled: true }),
        { wrapper: createWrapper() },
      );

      await waitFor(() =>
        expect(result.current.error).toBe('venue_unavailable'),
      );
      expect(result.current.items).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('reads nothing and refetches nothing until the caller enables it', async () => {
      const { result } = renderHook(
        () => usePredictActivityItems({ enabled: false }),
        { wrapper: createWrapper() },
      );

      await act(() => result.current.refetch());
      await act(() => result.current.loadMore());
      expect(mockGetCanonicalActivity).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('treats Predictions rows on another chain as another Venue', () => {
      const { result } = renderHook(
        () => usePredictActivityItems({ enabled: true }),
        { wrapper: createWrapper() },
      );
      const { isInactiveVenueItem } = result.current;

      expect(isInactiveVenueItem(polymarketDeposit)).toBe(true);
      expect(
        isInactiveVenueItem({
          ...polymarketDeposit,
          type: 'predictionPlaced',
        } as ActivityListItem),
      ).toBe(true);
      expect(
        isInactiveVenueItem({
          ...polymarketDeposit,
          chainId: 'kalshi:mainnet',
          type: 'predictionPlaced',
        } as ActivityListItem),
      ).toBe(false);
      expect(
        isInactiveVenueItem({
          ...polymarketDeposit,
          type: 'send',
        } as ActivityListItem),
      ).toBe(false);
    });
  });

  describe('when the Active Venue changes', () => {
    it('drops the old Venue rows and reads only the new one', async () => {
      mockGetCanonicalActivity.mockResolvedValue({
        ...firstPage,
        nextCursor: undefined,
      });
      givenActiveVenue({
        status: 'ready',
        venue: 'polymarket',
        source: 'rollout',
      });
      const { result, rerender } = renderHook(
        () => usePredictActivityItems({ enabled: true }),
        { wrapper: createWrapper() },
      );
      await waitFor(() =>
        expect(result.current.items.map(({ hash }) => hash)).toEqual([
          'predict-buy',
        ]),
      );
      expect(mockGetCanonicalActivity).not.toHaveBeenCalled();

      givenActiveVenue({ status: 'ready', venue: 'kalshi', source: 'rollout' });
      rerender(undefined);

      expect(
        result.current.items.some(({ chainId }) => chainId === 'eip155:137'),
      ).toBe(false);
      await waitFor(() => expect(result.current.items).toHaveLength(3));
      expect(
        result.current.items.every(
          ({ chainId }) => chainId === 'kalshi:mainnet',
        ),
      ).toBe(true);
      expect(result.current.isInactiveVenueItem(polymarketDeposit)).toBe(true);

      givenActiveVenue({
        status: 'ready',
        venue: 'polymarket',
        source: 'rollout',
      });
      rerender(undefined);

      expect(result.current.items.map(({ hash }) => hash)).toEqual([
        'predict-buy',
      ]);
      expect(result.current.isInactiveVenueItem(polymarketDeposit)).toBe(false);
    });
  });

  describe('while the legacy implementation is active', () => {
    beforeEach(() => {
      givenActiveVenue({
        status: 'ready',
        venue: 'polymarket',
        source: 'rollout',
      });
    });

    it('passes legacy Activity through on Polygon in USDC, and reads no canonical Activity', async () => {
      const { result } = renderHook(
        () => usePredictActivityItems({ enabled: true }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.items).toHaveLength(1));
      expect(mockEnsurePolygonNetworkExists).toHaveBeenCalledTimes(1);
      expect(mockGetCanonicalActivity).not.toHaveBeenCalled();
      expect(result.current.isInactiveVenueItem(polymarketDeposit)).toBe(false);
      expect(result.current.items[0]).toEqual({
        type: 'predictionPlaced',
        chainId: 'eip155:137',
        status: 'success',
        timestamp: 200_000,
        hash: 'predict-buy',
        data: {
          token: {
            amount: '100',
            symbol: 'USDC',
            assetId: undefined,
            direction: 'out',
          },
          eventTitle: 'Will it rain?',
          icon: undefined,
        },
      });
    });

    it('runs no side effect until the caller enables it', async () => {
      await expectInactiveHookHasNoSideEffects({
        useInactiveHook: () => usePredictActivityItems({ enabled: false }),
        sideEffects: [mockEnsurePolygonNetworkExists, mockGetActivity],
        wrapper: createWrapper(),
      });
    });
  });

  describe('while the Active Venue resolves', () => {
    beforeEach(() => {
      givenActiveVenue({ status: 'resolving' });
    });

    it('reports loading without a side effect', async () => {
      await expectInactiveHookHasNoSideEffects({
        useInactiveHook: () => usePredictActivityItems({ enabled: true }),
        sideEffects: [mockEnsurePolygonNetworkExists, mockGetActivity],
        wrapper: createWrapper(),
      });

      const { result } = renderHook(
        () => usePredictActivityItems({ enabled: true }),
        { wrapper: createWrapper() },
      );
      expect(result.current.items).toEqual([]);
      expect(result.current.isLoading).toBe(true);
    });

    it('does not report loading while the caller keeps it disabled', () => {
      const { result } = renderHook(
        () => usePredictActivityItems({ enabled: false }),
        { wrapper: createWrapper() },
      );

      expect(result.current.isLoading).toBe(false);
    });
  });
});
