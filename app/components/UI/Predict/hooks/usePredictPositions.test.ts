import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type PredictPosition, PredictPositionStatus } from '../types';
import { usePredictPositions } from './usePredictPositions';

const MOCK_ADDRESS = '0x1234567890123456789012345678901234567890';

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

const mockGetPositions = jest.fn<
  Promise<PredictPosition[]>,
  [{ address: string }]
>();
jest.mock('../queries', () => ({
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
  },
}));

const createPosition = (
  id: string,
  overrides: Partial<PredictPosition> = {},
): PredictPosition => ({
  id,
  providerId: 'provider-1',
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcome: 'Yes',
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

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return { Wrapper, queryClient };
};

describe('usePredictPositions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnsurePolygonNetworkExists.mockResolvedValue(undefined);
    mockGetPositions.mockResolvedValue([]);
  });

  it('returns empty positions when query returns no positions', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePredictPositions(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('returns active and claimable positions when claimable is undefined', async () => {
    const { Wrapper } = createWrapper();
    const activePosition = createPosition('active-1', { claimable: false });
    const claimablePosition = createPosition('claimable-1', {
      claimable: true,
      marketId: 'market-2',
    });
    mockGetPositions.mockResolvedValue([activePosition, claimablePosition]);

    const { result } = renderHook(() => usePredictPositions(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(2);
    });

    expect(result.current.data).toEqual([activePosition, claimablePosition]);
  });

  it('returns only active positions when claimable is false', async () => {
    const { Wrapper } = createWrapper();
    const activePosition = createPosition('active-2', { claimable: false });
    const claimablePosition = createPosition('claimable-2', {
      claimable: true,
      marketId: 'market-3',
    });
    mockGetPositions.mockResolvedValue([activePosition, claimablePosition]);

    const { result } = renderHook(
      () => usePredictPositions({ claimable: false }),
      {
        wrapper: Wrapper,
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([activePosition]);
  });

  it('returns only claimable positions when claimable is true', async () => {
    const { Wrapper } = createWrapper();
    const activePosition = createPosition('active-3', { claimable: false });
    const claimablePosition = createPosition('claimable-3', {
      claimable: true,
    });
    mockGetPositions.mockResolvedValue([activePosition, claimablePosition]);

    const { result } = renderHook(
      () => usePredictPositions({ claimable: true }),
      {
        wrapper: Wrapper,
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([claimablePosition]);
  });

  it('filters positions by marketId', async () => {
    const { Wrapper } = createWrapper();
    const targetMarketActive = createPosition('active-market-target', {
      marketId: 'market-target',
      claimable: false,
    });
    const otherMarketClaimable = createPosition('claimable-market-other', {
      marketId: 'market-other',
      claimable: true,
    });
    mockGetPositions.mockResolvedValue([
      targetMarketActive,
      otherMarketClaimable,
    ]);

    const { result } = renderHook(
      () => usePredictPositions({ marketId: 'market-target' }),
      {
        wrapper: Wrapper,
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([targetMarketActive]);
  });

  it('does not fetch positions when enabled is false', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => usePredictPositions({ enabled: false }),
      {
        wrapper: Wrapper,
      },
    );

    expect(mockGetPositions).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('returns query error message when query fails', async () => {
    const { Wrapper } = createWrapper();
    mockGetPositions.mockRejectedValue(new Error('Positions request failed'));

    const { result } = renderHook(() => usePredictPositions(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });

    expect(result.current.error?.message).toBe('Positions request failed');
    expect(result.current.data).toBeUndefined();
  });

  it('applies claimable and marketId filters together', async () => {
    const { Wrapper } = createWrapper();
    const activeTargetMarket = createPosition('active-target-market', {
      marketId: 'market-filter',
      claimable: false,
    });
    const claimableTargetMarket = createPosition('claimable-target-market', {
      marketId: 'market-filter',
      claimable: true,
    });
    const claimableOtherMarket = createPosition('claimable-other-market', {
      marketId: 'market-other',
      claimable: true,
    });
    mockGetPositions.mockResolvedValue([
      activeTargetMarket,
      claimableTargetMarket,
      claimableOtherMarket,
    ]);

    const { result } = renderHook(
      () => usePredictPositions({ claimable: true, marketId: 'market-filter' }),
      {
        wrapper: Wrapper,
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([claimableTargetMarket]);
  });
});
