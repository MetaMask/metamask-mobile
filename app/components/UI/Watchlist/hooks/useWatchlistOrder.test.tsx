import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notifyManager } from '@tanstack/query-core';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { UnifiedWatchlistToken } from '../types';
import { useWatchlistOrder } from './useWatchlistOrder';
import {
  readWatchlistOrder,
  writeWatchlistOrder,
} from '../watchlistOrderStorage';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => 'group-1'),
}));

jest.mock('../watchlistOrderStorage', () => ({
  readWatchlistOrder: jest.fn(),
  writeWatchlistOrder: jest.fn(),
}));

const mockedReadWatchlistOrder = jest.mocked(readWatchlistOrder);
const mockedWriteWatchlistOrder = jest.mocked(writeWatchlistOrder);

notifyManager.setBatchNotifyFunction((callback: () => void) => {
  callback();
});
notifyManager.setScheduler((callback: () => void) => {
  callback();
});

const createToken = (key: string): UnifiedWatchlistToken => ({
  kind: 'token',
  key,
  assetId: key,
  token: {} as TrendingAsset,
});

interface TestWrapperResult {
  wrapper: ({ children }: { children: React.ReactNode }) => React.JSX.Element;
  queryClient: QueryClient;
}

const createWrapper = (): TestWrapperResult => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const wrapper = ({
    children,
  }: {
    children: React.ReactNode;
  }): React.JSX.Element => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
};

describe('useWatchlistOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedReadWatchlistOrder.mockResolvedValue([]);
    mockedWriteWatchlistOrder.mockResolvedValue(undefined);
  });

  it('reconciles persisted order without writing during hydration', async () => {
    const tokenA = createToken('token:a');
    const tokenB = createToken('token:b');
    mockedReadWatchlistOrder.mockResolvedValue([tokenB.key, tokenA.key]);
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useWatchlistOrder([tokenA, tokenB], {
          enabled: true,
        }),
      { wrapper },
    );

    await waitFor(() =>
      expect(result.current.orderedItems).toEqual([tokenB, tokenA]),
    );
    expect(result.current.isReady).toBe(true);
    expect(mockedWriteWatchlistOrder).not.toHaveBeenCalled();
  });

  it('preserves persisted rows that are not hydrated during an early edit', async () => {
    const tokenA = createToken('token:a');
    const unavailablePerpKey = 'perp:btc';
    mockedReadWatchlistOrder.mockResolvedValue([
      unavailablePerpKey,
      tokenA.key,
    ]);
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useWatchlistOrder([tokenA], {
          enabled: true,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isReady).toBe(true));

    await act(async () => {
      await result.current.persistOrder([tokenA.key]);
    });

    expect(mockedWriteWatchlistOrder).toHaveBeenCalledWith('group-1', [
      tokenA.key,
      unavailablePerpKey,
    ]);
  });

  it('keeps new items at the end while persisted order is loading', async () => {
    const tokenA = createToken('token:a');
    const tokenB = createToken('token:b');
    let resolveRead: ((order: string[]) => void) | undefined;
    mockedReadWatchlistOrder.mockImplementation(
      async () =>
        new Promise<string[]>((resolve) => {
          resolveRead = resolve;
        }),
    );
    const { wrapper } = createWrapper();
    const { result, rerender } = renderHook(
      ({ items }: { items: UnifiedWatchlistToken[] }) =>
        useWatchlistOrder(items, { enabled: true }),
      {
        initialProps: { items: [tokenA] },
        wrapper,
      },
    );

    await waitFor(() => expect(resolveRead).toBeDefined());
    rerender({ items: [tokenB, tokenA] });

    expect(result.current.orderedItems).toEqual([tokenA, tokenB]);

    await act(async () => {
      resolveRead?.([tokenA.key]);
    });
    await waitFor(() =>
      expect(result.current.orderedItems).toEqual([tokenA, tokenB]),
    );
  });

  it('serializes overlapping writes and persists the newest order last', async () => {
    const tokenA = createToken('token:a');
    const tokenB = createToken('token:b');
    mockedReadWatchlistOrder.mockResolvedValue([tokenA.key, tokenB.key]);
    const firstOrder = [tokenB.key, tokenA.key];
    const secondOrder = [tokenA.key, tokenB.key];
    let resolveFirstWrite: (() => void) | undefined;
    let resolveSecondWrite: (() => void) | undefined;
    mockedWriteWatchlistOrder.mockImplementation(async () => {
      if (!resolveFirstWrite) {
        return new Promise<void>((resolve) => {
          resolveFirstWrite = resolve;
        });
      }
      return new Promise<void>((resolve) => {
        resolveSecondWrite = resolve;
      });
    });
    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(
      () =>
        useWatchlistOrder([tokenA, tokenB], {
          enabled: true,
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isReady).toBe(true));

    let firstWrite: Promise<void> = Promise.resolve();
    let secondWrite: Promise<void> = Promise.resolve();
    act(() => {
      firstWrite = result.current.persistOrder(firstOrder);
      secondWrite = result.current.persistOrder(secondOrder);
    });
    await waitFor(() =>
      expect(mockedWriteWatchlistOrder).toHaveBeenCalledTimes(1),
    );

    await act(async () => {
      resolveFirstWrite?.();
      await firstWrite;
    });
    await waitFor(() =>
      expect(mockedWriteWatchlistOrder).toHaveBeenCalledTimes(2),
    );

    await act(async () => {
      resolveSecondWrite?.();
      await secondWrite;
    });

    expect(mockedWriteWatchlistOrder).toHaveBeenLastCalledWith(
      'group-1',
      secondOrder,
    );
    expect(queryClient.getQueryData(['watchlist-order', 'group-1'])).toEqual(
      secondOrder,
    );
  });

  it('rolls back only the failed optimistic order', async () => {
    const tokenA = createToken('token:a');
    const tokenB = createToken('token:b');
    mockedReadWatchlistOrder.mockResolvedValue([tokenA.key, tokenB.key]);
    mockedWriteWatchlistOrder.mockRejectedValue(new Error('write failed'));
    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(
      () =>
        useWatchlistOrder([tokenA, tokenB], {
          enabled: true,
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isReady).toBe(true));

    let writeError: unknown;
    await act(async () => {
      try {
        await result.current.persistOrder([tokenB.key, tokenA.key]);
      } catch (error) {
        writeError = error;
      }
    });

    expect(writeError).toEqual(new Error('write failed'));
    expect(queryClient.getQueryData(['watchlist-order', 'group-1'])).toEqual([
      tokenA.key,
      tokenB.key,
    ]);
  });

  it('appends keys from the latest cached order', async () => {
    const tokenA = createToken('token:a');
    const tokenB = createToken('token:b');
    mockedReadWatchlistOrder.mockResolvedValue([tokenA.key, tokenB.key]);
    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(
      () =>
        useWatchlistOrder([tokenA, tokenB], {
          enabled: true,
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isReady).toBe(true));

    await act(async () => {
      await Promise.all([
        result.current.appendOrderKey('token:c'),
        result.current.appendOrderKey('token:d'),
      ]);
    });

    expect(queryClient.getQueryData(['watchlist-order', 'group-1'])).toEqual([
      tokenA.key,
      tokenB.key,
      'token:c',
      'token:d',
    ]);
  });

  it('rolls back overlapping failed writes to the durable order', async () => {
    const tokenA = createToken('token:a');
    const tokenB = createToken('token:b');
    const tokenC = createToken('token:c');
    const durableOrder = [tokenA.key, tokenB.key, tokenC.key];
    mockedReadWatchlistOrder.mockResolvedValue(durableOrder);
    mockedWriteWatchlistOrder.mockRejectedValue(new Error('write failed'));
    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(
      () =>
        useWatchlistOrder([tokenA, tokenB, tokenC], {
          enabled: true,
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isReady).toBe(true));

    await act(async () => {
      await Promise.all([
        result.current
          .persistOrder([tokenB.key, tokenA.key, tokenC.key])
          .catch(() => undefined),
        result.current
          .persistOrder([tokenC.key, tokenB.key, tokenA.key])
          .catch(() => undefined),
      ]);
    });

    expect(queryClient.getQueryData(['watchlist-order', 'group-1'])).toEqual(
      durableOrder,
    );
  });

  it('does not overwrite durable rollback order when a second hook mounts mid-write', async () => {
    const tokenA = createToken('token:a');
    const tokenB = createToken('token:b');
    const durableOrder = [tokenA.key, tokenB.key];
    mockedReadWatchlistOrder.mockResolvedValue(durableOrder);
    let rejectWrite: ((error: Error) => void) | undefined;
    mockedWriteWatchlistOrder.mockImplementation(
      async () =>
        new Promise<void>((_resolve, reject) => {
          rejectWrite = reject;
        }),
    );
    const { wrapper, queryClient } = createWrapper();
    const first = renderHook(
      () => useWatchlistOrder([tokenA, tokenB], { enabled: true }),
      { wrapper },
    );
    await waitFor(() => expect(first.result.current.isReady).toBe(true));

    let pendingWrite: Promise<void> = Promise.resolve();
    act(() => {
      pendingWrite = first.result.current
        .persistOrder([tokenB.key, tokenA.key])
        .catch(() => undefined);
    });
    await waitFor(() =>
      expect(mockedWriteWatchlistOrder).toHaveBeenCalledTimes(1),
    );

    // Mounting a second hook while the optimistic write is in flight must not
    // treat the cached optimistic order as the durable rollback baseline.
    renderHook(() => useWatchlistOrder([tokenA, tokenB], { enabled: true }), {
      wrapper,
    });

    await act(async () => {
      rejectWrite?.(new Error('write failed'));
      await pendingWrite;
    });

    expect(queryClient.getQueryData(['watchlist-order', 'group-1'])).toEqual(
      durableOrder,
    );
  });
});
