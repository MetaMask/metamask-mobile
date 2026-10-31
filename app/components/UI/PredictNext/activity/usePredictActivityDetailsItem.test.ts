import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { PredictActivity } from '../../Predict/types';
import { useActiveVenue } from '../implementation/activeVenue';
import { expectInactiveHookHasNoSideEffects } from '../implementation/inactiveHook.testUtils';
import type { ActiveVenueResolution } from '../implementation/types';
import { usePredictActivityDetailsItem } from './usePredictActivityDetailsItem';

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

jest.mock('../../Predict/selectors/featureFlags', () => ({
  selectPredictEnabledFlag: () => true,
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

const claimActivity: PredictActivity = {
  id: 'predict-claim',
  providerId: 'polymarket',
  title: 'Will it rain?',
  entry: { type: 'claimWinnings', timestamp: 100, amount: 250 },
};

const givenActiveVenue = (resolution: ActiveVenueResolution) =>
  jest.mocked(useActiveVenue).mockReturnValue(resolution);

const mockGetCanonicalActivity = jest.fn();

const kalshiSettlement = {
  type: 'settlement',
  venueId: 'kalshi',
  id: 'settlement-1',
  marketId: 'KXNCAAFGAME-18OCT25UTAHBYU-UTAH',
  side: 'yes',
  shares: '10',
  result: 'yes',
  proceeds: '10',
  realizedPnl: '4.2',
  timestamp: '2026-10-19T04:12:00.000Z',
  context: {
    eventId: 'KXNCAAFGAME-18OCT25UTAHBYU',
    eventTitle: 'Utah at BYU',
    marketQuestion: 'Utah to win?',
    outcomeLabel: 'Utah',
  },
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        queryFn: ({ queryKey, pageParam }) => {
          const [, venueId, params] = queryKey as [string, string, unknown];
          return mockGetCanonicalActivity(venueId, params, pageParam);
        },
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('usePredictActivityDetailsItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActivity.mockResolvedValue({
      activities: [claimActivity],
      nextCursor: undefined,
    });
    mockEnsurePolygonNetworkExists.mockResolvedValue(undefined);
    mockGetCanonicalActivity.mockResolvedValue({
      venueId: 'kalshi',
      activity: [kalshiSettlement],
    });
  });

  describe('while the next implementation is active', () => {
    beforeEach(() => {
      givenActiveVenue({ status: 'ready', venue: 'kalshi', source: 'rollout' });
    });

    it('never ensures Polygon or reads legacy Activity', async () => {
      await expectInactiveHookHasNoSideEffects({
        useInactiveHook: () =>
          usePredictActivityDetailsItem('settlement-1', 'kalshi:mainnet'),
        sideEffects: [mockEnsurePolygonNetworkExists, mockGetActivity],
        wrapper: createWrapper(),
      });
    });

    it('resolves the canonical entry by the venue chain id', async () => {
      const { result } = renderHook(
        () => usePredictActivityDetailsItem('settlement-1', 'kalshi:mainnet'),
        { wrapper: createWrapper() },
      );

      expect(result.current.isLoading).toBe(true);
      await waitFor(() => expect(result.current.item).toBeDefined());
      expect(mockGetCanonicalActivity).toHaveBeenCalledWith(
        'kalshi',
        { limit: 20 },
        undefined,
      );
      expect(result.current).toEqual({
        isLoading: false,
        item: expect.objectContaining({
          type: 'predictionSettled',
          chainId: 'kalshi:mainnet',
          status: 'success',
          hash: 'settlement-1',
          data: expect.objectContaining({
            token: expect.objectContaining({ amount: '10', symbol: 'USD' }),
            outcomeLabel: 'Utah',
            marketQuestion: 'Utah to win?',
            side: 'yes',
            result: 'yes',
            shares: '10',
            realizedPnl: '4.2',
          }),
        }),
      });
    });

    it('matches the opaque id exactly', async () => {
      const { result } = renderHook(
        () => usePredictActivityDetailsItem('SETTLEMENT-1', 'kalshi:mainnet'),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.item).toBeUndefined();
    });

    it.each([
      ['Polygon', 'eip155:137'],
      ['no', undefined],
    ] as const)(
      'resolves nothing and reads nothing for %s chain id',
      async (_label, chainId) => {
        await expectInactiveHookHasNoSideEffects({
          useInactiveHook: () =>
            usePredictActivityDetailsItem('settlement-1', chainId),
          sideEffects: [
            mockEnsurePolygonNetworkExists,
            mockGetActivity,
            mockGetCanonicalActivity,
          ],
          wrapper: createWrapper(),
        });

        const { result } = renderHook(
          () => usePredictActivityDetailsItem('settlement-1', chainId),
          { wrapper: createWrapper() },
        );
        expect(result.current).toEqual({ item: undefined, isLoading: false });
      },
    );
  });

  describe('while the legacy implementation is active', () => {
    beforeEach(() => {
      givenActiveVenue({
        status: 'ready',
        venue: 'polymarket',
        source: 'rollout',
      });
    });

    it('resolves the legacy item on Polygon in USDC', async () => {
      const { result } = renderHook(
        () => usePredictActivityDetailsItem('PREDICT-CLAIM', 'eip155:137'),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.item).toBeDefined());
      expect(mockEnsurePolygonNetworkExists).toHaveBeenCalledTimes(1);
      expect(mockGetCanonicalActivity).not.toHaveBeenCalled();
      expect(result.current).toEqual({
        isLoading: false,
        item: expect.objectContaining({
          type: 'predictionClaimWinnings',
          chainId: 'eip155:137',
          hash: 'predict-claim',
          data: expect.objectContaining({
            token: expect.objectContaining({ amount: '250', symbol: 'USDC' }),
          }),
        }),
      });
    });

    it('never resolves a Kalshi chain id', async () => {
      await expectInactiveHookHasNoSideEffects({
        useInactiveHook: () =>
          usePredictActivityDetailsItem('settlement-1', 'kalshi:mainnet'),
        sideEffects: [
          mockEnsurePolygonNetworkExists,
          mockGetActivity,
          mockGetCanonicalActivity,
        ],
        wrapper: createWrapper(),
      });
    });

    it('runs no side effect without an identifier', async () => {
      await expectInactiveHookHasNoSideEffects({
        useInactiveHook: () => usePredictActivityDetailsItem(undefined),
        sideEffects: [mockEnsurePolygonNetworkExists, mockGetActivity],
        wrapper: createWrapper(),
      });
    });
  });

  describe('while the Active Venue resolves', () => {
    beforeEach(() => {
      givenActiveVenue({ status: 'resolving' });
    });

    it('waits without a side effect', async () => {
      await expectInactiveHookHasNoSideEffects({
        useInactiveHook: () => usePredictActivityDetailsItem('predict-claim'),
        sideEffects: [mockEnsurePolygonNetworkExists, mockGetActivity],
        wrapper: createWrapper(),
      });

      const { result } = renderHook(
        () => usePredictActivityDetailsItem('predict-claim'),
        { wrapper: createWrapper() },
      );
      expect(result.current).toEqual({ item: undefined, isLoading: true });
    });
  });
});
