import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  type GetAllPositionsResult,
  type PredictPosition,
  PredictPositionStatus,
} from '../types';
import { predictQueries } from '../queries';
import { usePredictPositions } from './usePredictPositions';

const MOCK_ADDRESS = '0x1234567890123456789012345678901234567890';

const mockUseFocusEffect = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => mockUseFocusEffect(callback),
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

const mockGetAllPositions = jest.fn<
  Promise<GetAllPositionsResult>,
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
        queryFn: () => mockGetAllPositions({ address }),
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

const createPositionsResult = (
  overrides: Partial<GetAllPositionsResult> = {},
): GetAllPositionsResult => ({
  activePositions: [],
  claimablePositions: [],
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
    mockGetAllPositions.mockResolvedValue(createPositionsResult());
  });

  it('returns empty positions when query returns no positions', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePredictPositions(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.positions).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('returns active and claimable positions when claimable is undefined', async () => {
    const { Wrapper } = createWrapper();
    const activePosition = createPosition('active-1', { claimable: false });
    const claimablePosition = createPosition('claimable-1', {
      claimable: true,
      marketId: 'market-2',
    });
    mockGetAllPositions.mockResolvedValue(
      createPositionsResult({
        activePositions: [activePosition],
        claimablePositions: [claimablePosition],
      }),
    );

    const { result } = renderHook(() => usePredictPositions(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.positions).toHaveLength(2);
    });

    expect(result.current.positions).toEqual([
      activePosition,
      claimablePosition,
    ]);
  });

  it('returns only active positions when claimable is false', async () => {
    const { Wrapper } = createWrapper();
    const activePosition = createPosition('active-2', { claimable: false });
    const claimablePosition = createPosition('claimable-2', {
      claimable: true,
      marketId: 'market-3',
    });
    mockGetAllPositions.mockResolvedValue(
      createPositionsResult({
        activePositions: [activePosition],
        claimablePositions: [claimablePosition],
      }),
    );

    const { result } = renderHook(
      () => usePredictPositions({ claimable: false }),
      {
        wrapper: Wrapper,
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.positions).toEqual([activePosition]);
  });

  it('returns only claimable positions when claimable is true', async () => {
    const { Wrapper } = createWrapper();
    const activePosition = createPosition('active-3', { claimable: false });
    const claimablePosition = createPosition('claimable-3', {
      claimable: true,
    });
    mockGetAllPositions.mockResolvedValue(
      createPositionsResult({
        activePositions: [activePosition],
        claimablePositions: [claimablePosition],
      }),
    );

    const { result } = renderHook(
      () => usePredictPositions({ claimable: true }),
      {
        wrapper: Wrapper,
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.positions).toEqual([claimablePosition]);
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
    mockGetAllPositions.mockResolvedValue(
      createPositionsResult({
        activePositions: [targetMarketActive],
        claimablePositions: [otherMarketClaimable],
      }),
    );

    const { result } = renderHook(
      () => usePredictPositions({ marketId: 'market-target' }),
      {
        wrapper: Wrapper,
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.positions).toEqual([targetMarketActive]);
  });

  it('does not fetch positions when enabled is false', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => usePredictPositions({ enabled: false }),
      {
        wrapper: Wrapper,
      },
    );

    expect(mockGetAllPositions).not.toHaveBeenCalled();
    expect(result.current.positions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('registers useFocusEffect for focus-based refresh', () => {
    const { Wrapper } = createWrapper();

    renderHook(() => usePredictPositions({ enabled: false }), {
      wrapper: Wrapper,
    });

    expect(mockUseFocusEffect).toHaveBeenCalledTimes(1);
    expect(mockUseFocusEffect.mock.calls[0][0]).toEqual(expect.any(Function));
  });

  it('returns query error message when query fails', async () => {
    const { Wrapper } = createWrapper();
    mockGetAllPositions.mockRejectedValue(
      new Error('Positions request failed'),
    );

    const { result } = renderHook(() => usePredictPositions(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Positions request failed');
    });

    expect(result.current.positions).toEqual([]);
  });

  it('invalidates positions query when refetch is called', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => usePredictPositions(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: predictQueries.positions.keys.all(),
    });
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
    mockGetAllPositions.mockResolvedValue(
      createPositionsResult({
        activePositions: [activeTargetMarket],
        claimablePositions: [claimableTargetMarket, claimableOtherMarket],
      }),
    );

    const { result } = renderHook(
      () => usePredictPositions({ claimable: true, marketId: 'market-filter' }),
      {
        wrapper: Wrapper,
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.positions).toEqual([claimableTargetMarket]);
  });
});
