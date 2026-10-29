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

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
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
  });

  describe('while the next implementation is active', () => {
    beforeEach(() => {
      givenActiveVenue({ status: 'ready', venue: 'kalshi', source: 'rollout' });
    });

    it('never ensures Polygon or reads legacy Activity', async () => {
      await expectInactiveHookHasNoSideEffects({
        useInactiveHook: () => usePredictActivityDetailsItem('predict-claim'),
        sideEffects: [mockEnsurePolygonNetworkExists, mockGetActivity],
        wrapper: createWrapper(),
      });
    });

    it('resolves no item', () => {
      const { result } = renderHook(
        () => usePredictActivityDetailsItem('predict-claim'),
        { wrapper: createWrapper() },
      );

      expect(result.current).toEqual({ item: undefined, isLoading: false });
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

    it('resolves the legacy item on Polygon in USDC', async () => {
      const { result } = renderHook(
        () => usePredictActivityDetailsItem('PREDICT-CLAIM', 'eip155:137'),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.item).toBeDefined());
      expect(mockEnsurePolygonNetworkExists).toHaveBeenCalledTimes(1);
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
