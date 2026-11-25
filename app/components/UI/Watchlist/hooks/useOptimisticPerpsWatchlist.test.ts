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

    const { result } = renderHook(() =>
      useOptimisticPerpsWatchlist({
        orderedItems: [createUnifiedWatchlistPerp(ETH_MARKET)],
        persistedPerps: [createUnifiedWatchlistPerp(ETH_MARKET)],
        perpsMembershipSymbols: ['ETH'],
        addPerpToWatchlist,
        removePerpFromWatchlist,
        onPerpAdded,
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

    const { result } = renderHook(() =>
      useOptimisticPerpsWatchlist({
        orderedItems: [createUnifiedWatchlistPerp(ETH_MARKET)],
        persistedPerps: [createUnifiedWatchlistPerp(ETH_MARKET)],
        perpsMembershipSymbols: ['ETH'],
        addPerpToWatchlist,
        removePerpFromWatchlist,
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
  });
});
