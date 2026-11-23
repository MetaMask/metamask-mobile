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

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { Wrapper, queryClient };
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
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useWatchlistOrder([tokenA, tokenB], {
          enabled: true,
          isReady: false,
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() =>
      expect(result.current.orderedItems).toEqual([tokenB, tokenA]),
    );
    expect(result.current.isReady).toBe(false);
    expect(mockedWriteWatchlistOrder).not.toHaveBeenCalled();
  });

  it('serializes overlapping writes and persists the newest order last', async () => {
    const tokenA = createToken('token:a');
    const tokenB = createToken('token:b');
    mockedReadWatchlistOrder.mockResolvedValue([tokenA.key, tokenB.key]);
    const firstOrder = [tokenB.key, tokenA.key];
    const secondOrder = [tokenA.key, tokenB.key];
    let resolveFirstWrite: (() => void) | undefined;
    let resolveSecondWrite: (() => void) | undefined;
    mockedWriteWatchlistOrder.mockImplementation(() => {
      if (!resolveFirstWrite) {
        return new Promise<void>((resolve) => {
          resolveFirstWrite = resolve;
        });
      }
      return new Promise<void>((resolve) => {
        resolveSecondWrite = resolve;
      });
    });
    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(
      () =>
        useWatchlistOrder([tokenA, tokenB], {
          enabled: true,
          isReady: true,
        }),
      { wrapper: Wrapper },
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
    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(
      () =>
        useWatchlistOrder([tokenA, tokenB], {
          enabled: true,
          isReady: true,
        }),
      { wrapper: Wrapper },
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

  it('rolls back overlapping failed writes to the durable order', async () => {
    const tokenA = createToken('token:a');
    const tokenB = createToken('token:b');
    const tokenC = createToken('token:c');
    const durableOrder = [tokenA.key, tokenB.key, tokenC.key];
    mockedReadWatchlistOrder.mockResolvedValue(durableOrder);
    mockedWriteWatchlistOrder.mockRejectedValue(new Error('write failed'));
    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(
      () =>
        useWatchlistOrder([tokenA, tokenB, tokenC], {
          enabled: true,
          isReady: true,
        }),
      { wrapper: Wrapper },
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
});
