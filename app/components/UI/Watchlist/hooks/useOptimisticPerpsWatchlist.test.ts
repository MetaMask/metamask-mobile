import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PerpsMarketData } from '@metamask/perps-controller';
import { createUnifiedWatchlistPerp } from '../utils';
import { useOptimisticPerpsWatchlist } from './useOptimisticPerpsWatchlist';

const ETH_MARKET = {
  symbol: 'ETH',
  name: 'Ethereum Perpetual',
  price: '$2,000.00',
  change24h: '+$50.00',
  change24hPercent: '+2.50%',
  volume: '$1.5B',
  maxLeverage: '50x',
  openInterest: '$500M',
  marketType: 'crypto',
} as PerpsMarketData;

const SOL_MARKET: PerpsMarketData = {
  ...ETH_MARKET,
  symbol: 'SOL',
  name: 'Solana Perpetual',
};

describe('useOptimisticPerpsWatchlist', () => {
  it('optimistically adds a Perp and rolls back when persistence fails', async () => {
    let resolveAdd: ((value: boolean) => void) | undefined;
    const addPerpToWatchlist = jest.fn(
      async () =>
        new Promise<boolean>((resolve) => {
          resolveAdd = resolve;
        }),
    );
    const removePerpFromWatchlist = jest.fn().mockResolvedValue(true);
    const onPerpAdded = jest.fn();
    const onMutationError = jest.fn();

    const { result } = renderHook(() =>
      useOptimisticPerpsWatchlist({
        accountGroupId: 'group-1',
        orderedItems: [createUnifiedWatchlistPerp(ETH_MARKET)],
        persistedPerps: [createUnifiedWatchlistPerp(ETH_MARKET)],
        perpsMembershipSymbols: ['ETH'],
        addPerpToWatchlist,
        removePerpFromWatchlist,
        onPerpAdded,
        onMutationError,
      }),
    );

    act(() => {
      result.current.addPerp(SOL_MARKET);
    });

    expect(result.current.displayOrderedItems.map((item) => item.key)).toEqual([
      'perp:eth',
      'perp:sol',
    ]);
    expect(result.current.watchlistedPerpSymbols).toEqual(['ETH', 'SOL']);
    expect(result.current.hasPendingPerpMutations).toBe(true);

    await act(async () => {
      resolveAdd?.(false);
    });

    await waitFor(() => {
      expect(result.current.hasPendingPerpMutations).toBe(false);
    });
    expect(result.current.displayOrderedItems.map((item) => item.key)).toEqual([
      'perp:eth',
    ]);
    expect(onPerpAdded).not.toHaveBeenCalled();
    expect(onMutationError).toHaveBeenCalledTimes(1);
    expect(onMutationError).toHaveBeenCalledWith('add', 'SOL');
  });

  it('invokes onMutationError when adding a Perp rejects', async () => {
    const addPerpToWatchlist = jest
      .fn()
      .mockRejectedValueOnce(new Error('Network error'));
    const removePerpFromWatchlist = jest.fn().mockResolvedValue(true);
    const onMutationError = jest.fn();

    const { result } = renderHook(() =>
      useOptimisticPerpsWatchlist({
        accountGroupId: 'group-1',
        orderedItems: [createUnifiedWatchlistPerp(ETH_MARKET)],
        persistedPerps: [createUnifiedWatchlistPerp(ETH_MARKET)],
        perpsMembershipSymbols: ['ETH'],
        addPerpToWatchlist,
        removePerpFromWatchlist,
        onMutationError,
      }),
    );

    await act(async () => {
      result.current.addPerp(SOL_MARKET);
    });

    await waitFor(() => {
      expect(result.current.hasPendingPerpMutations).toBe(false);
    });
    expect(onMutationError).toHaveBeenCalledTimes(1);
    expect(onMutationError).toHaveBeenCalledWith('add', 'SOL');
  });

  it('optimistically removes a Perp and rolls back on rejection', async () => {
    let rejectRemove: ((error: Error) => void) | undefined;
    const addPerpToWatchlist = jest.fn().mockResolvedValue(true);
    const removePerpFromWatchlist = jest.fn(
      async () =>
        new Promise<boolean>((_resolve, reject) => {
          rejectRemove = reject;
        }),
    );
    const onMutationError = jest.fn();

    const { result } = renderHook(() =>
      useOptimisticPerpsWatchlist({
        accountGroupId: 'group-1',
        orderedItems: [createUnifiedWatchlistPerp(ETH_MARKET)],
        persistedPerps: [createUnifiedWatchlistPerp(ETH_MARKET)],
        perpsMembershipSymbols: ['ETH'],
        addPerpToWatchlist,
        removePerpFromWatchlist,
        onMutationError,
      }),
    );

    act(() => {
      result.current.removePerp('ETH');
    });

    expect(result.current.displayOrderedItems).toEqual([]);
    expect(result.current.watchlistedPerpSymbols).toEqual([]);
    expect(result.current.hasPendingPerpMutations).toBe(true);

    await act(async () => {
      rejectRemove?.(new Error('Storage failed'));
    });

    await waitFor(() => {
      expect(result.current.hasPendingPerpMutations).toBe(false);
    });
    expect(result.current.displayOrderedItems.map((item) => item.key)).toEqual([
      'perp:eth',
    ]);
    expect(onMutationError).toHaveBeenCalledTimes(1);
    expect(onMutationError).toHaveBeenCalledWith('remove', 'ETH');
  });

  it('invokes onMutationError when removing a Perp returns false', async () => {
    const addPerpToWatchlist = jest.fn().mockResolvedValue(true);
    const removePerpFromWatchlist = jest.fn().mockResolvedValueOnce(false);
    const onMutationError = jest.fn();

    const { result } = renderHook(() =>
      useOptimisticPerpsWatchlist({
        accountGroupId: 'group-1',
        orderedItems: [createUnifiedWatchlistPerp(ETH_MARKET)],
        persistedPerps: [createUnifiedWatchlistPerp(ETH_MARKET)],
        perpsMembershipSymbols: ['ETH'],
        addPerpToWatchlist,
        removePerpFromWatchlist,
        onMutationError,
      }),
    );

    await act(async () => {
      result.current.removePerp('ETH');
    });

    await waitFor(() => {
      expect(result.current.hasPendingPerpMutations).toBe(false);
    });
    expect(result.current.displayOrderedItems.map((item) => item.key)).toEqual([
      'perp:eth',
    ]);
    expect(onMutationError).toHaveBeenCalledTimes(1);
    expect(onMutationError).toHaveBeenCalledWith('remove', 'ETH');
  });

  it('ignores stale failures from superseded mutations on the same symbol', async () => {
    let resolveFirstAdd: ((value: boolean) => void) | undefined;
    let resolveSecondAdd: ((value: boolean) => void) | undefined;
    const addPerpToWatchlist = jest
      .fn()
      .mockImplementationOnce(
        async () =>
          new Promise<boolean>((resolve) => {
            resolveFirstAdd = resolve;
          }),
      )
      .mockImplementationOnce(
        async () =>
          new Promise<boolean>((resolve) => {
            resolveSecondAdd = resolve;
          }),
      );
    const removePerpFromWatchlist = jest.fn().mockResolvedValue(true);
    const onMutationError = jest.fn();

    const { result } = renderHook(() =>
      useOptimisticPerpsWatchlist({
        accountGroupId: 'group-1',
        orderedItems: [createUnifiedWatchlistPerp(ETH_MARKET)],
        persistedPerps: [createUnifiedWatchlistPerp(ETH_MARKET)],
        perpsMembershipSymbols: ['ETH'],
        addPerpToWatchlist,
        removePerpFromWatchlist,
        onMutationError,
      }),
    );

    act(() => {
      result.current.addPerp(SOL_MARKET);
      result.current.removePerp('SOL');
      result.current.addPerp(SOL_MARKET);
    });

    await act(async () => {
      resolveFirstAdd?.(false);
    });

    expect(result.current.displayOrderedItems.map((item) => item.key)).toEqual([
      'perp:eth',
      'perp:sol',
    ]);
    expect(result.current.hasPendingPerpMutations).toBe(true);
    expect(onMutationError).not.toHaveBeenCalled();

    await act(async () => {
      resolveSecondAdd?.(true);
    });
  });

  it('clears optimistic overrides and ignores stale completions when accountGroupId changes', async () => {
    let resolveAdd: ((value: boolean) => void) | undefined;
    let rejectRemove: ((error: Error) => void) | undefined;
    const addPerpToWatchlist = jest.fn(
      async () =>
        new Promise<boolean>((resolve) => {
          resolveAdd = resolve;
        }),
    );
    const removePerpFromWatchlist = jest.fn(
      async () =>
        new Promise<boolean>((_resolve, reject) => {
          rejectRemove = reject;
        }),
    );
    const onPerpAdded = jest.fn();
    const onMutationError = jest.fn();

    const { result, rerender } = renderHook(
      ({ accountGroupId }: { accountGroupId: string | null }) =>
        useOptimisticPerpsWatchlist({
          accountGroupId,
          orderedItems: [createUnifiedWatchlistPerp(ETH_MARKET)],
          persistedPerps: [createUnifiedWatchlistPerp(ETH_MARKET)],
          perpsMembershipSymbols: ['ETH'],
          addPerpToWatchlist,
          removePerpFromWatchlist,
          onPerpAdded,
          onMutationError,
        }),
      { initialProps: { accountGroupId: 'group-1' } },
    );

    act(() => {
      result.current.addPerp(SOL_MARKET);
      result.current.removePerp('ETH');
    });

    expect(result.current.displayOrderedItems.map((item) => item.key)).toEqual([
      'perp:sol',
    ]);
    expect(result.current.hasPendingPerpMutations).toBe(true);

    rerender({ accountGroupId: 'group-2' });

    expect(result.current.displayOrderedItems.map((item) => item.key)).toEqual([
      'perp:eth',
    ]);
    expect(result.current.watchlistedPerpSymbols).toEqual(['ETH']);
    expect(result.current.hasPendingPerpMutations).toBe(false);

    // Even if user switches back to group-1 before the old promises settle,
    // stale completions from the earlier generation must still be ignored.
    rerender({ accountGroupId: 'group-1' });

    await act(async () => {
      resolveAdd?.(true);
      rejectRemove?.(new Error('Stale account error'));
    });

    expect(onPerpAdded).not.toHaveBeenCalled();
    expect(onMutationError).not.toHaveBeenCalled();
    expect(result.current.hasPendingPerpMutations).toBe(false);
    expect(result.current.displayOrderedItems.map((item) => item.key)).toEqual([
      'perp:eth',
    ]);
  });
});
