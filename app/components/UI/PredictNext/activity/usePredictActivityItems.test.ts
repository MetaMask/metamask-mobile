import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
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

const givenActiveVenue = (resolution: ActiveVenueResolution) =>
  jest.mocked(useActiveVenue).mockReturnValue(resolution);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
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
    });

    it('never ensures Polygon or reads legacy Activity', async () => {
      await expectInactiveHookHasNoSideEffects({
        useInactiveHook: () => usePredictActivityItems({ enabled: true }),
        sideEffects: [mockEnsurePolygonNetworkExists, mockGetActivity],
        wrapper: createWrapper(),
      });
    });

    it('returns no items, so no Polygon chain id or USDC quote asset', async () => {
      const { result } = renderHook(
        () => usePredictActivityItems({ enabled: true }),
        { wrapper: createWrapper() },
      );

      await expect(result.current.loadMore()).resolves.toBeUndefined();
      await expect(result.current.refetch()).resolves.toBeUndefined();
      expect(result.current).toEqual({
        items: [],
        isLoading: false,
        error: null,
        refetch: expect.any(Function),
        loadMore: expect.any(Function),
        hasMore: false,
        isFetchingMore: false,
      });
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

    it('passes legacy Activity through on Polygon in USDC', async () => {
      const { result } = renderHook(
        () => usePredictActivityItems({ enabled: true }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.items).toHaveLength(1));
      expect(mockEnsurePolygonNetworkExists).toHaveBeenCalledTimes(1);
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
