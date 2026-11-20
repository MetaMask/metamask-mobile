import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  notifyManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { UnifiedWatchlistToken } from '../types';
import {
  useWatchlistOrder,
  WATCHLIST_ORDER_READ_RETRY_COUNT,
} from './useWatchlistOrder';
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
  beforeAll(() => {
    notifyManager.setNotifyFunction((callback) => {
      act(callback);
    });
  });

  afterAll(() => {
    notifyManager.setNotifyFunction((callback) => callback());
  });

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

    expect(mockedWriteWatchlistOrder).not.toHaveBeenCalled();
  });

  it('persists an explicit user order', async () => {
    const tokenA = createToken('token:a');
    const tokenB = createToken('token:b');
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useWatchlistOrder([tokenA, tokenB], {
          enabled: true,
          isReady: true,
        }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.persistOrder([tokenB.key, tokenA.key]);
    });

    expect(mockedWriteWatchlistOrder).toHaveBeenCalledWith('group-1', [
      tokenB.key,
      tokenA.key,
    ]);
  });

  it('rejects persistence until mixed hydration is ready', async () => {
    const tokenA = createToken('token:a');
    const tokenB = createToken('token:b');
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useWatchlistOrder([tokenA, tokenB], {
          enabled: true,
          isReady: false,
        }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      result.current.persistOrder([tokenB.key, tokenA.key]),
    ).rejects.toThrow('Watchlist order is not ready to persist');

    expect(result.current.isReady).toBe(false);
    expect(mockedWriteWatchlistOrder).not.toHaveBeenCalled();
  });

  it('retries order reads with production defaults before becoming ready', async () => {
    const tokenA = createToken('token:a');
    const tokenB = createToken('token:b');
    mockedReadWatchlistOrder
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValue([tokenB.key, tokenA.key]);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () =>
        useWatchlistOrder([tokenA, tokenB], {
          enabled: true,
          isReady: true,
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(mockedReadWatchlistOrder).toHaveBeenCalledTimes(
      WATCHLIST_ORDER_READ_RETRY_COUNT + 1,
    );
    expect(result.current.orderedItems).toEqual([tokenB, tokenA]);
    expect(result.current.error).toBeNull();
  });

  it('exposes terminal read failure and recovers through retry', async () => {
    const tokenA = createToken('token:a');
    mockedReadWatchlistOrder.mockRejectedValue(
      new Error('storage unavailable'),
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useWatchlistOrder([tokenA], {
          enabled: true,
          isReady: true,
        }),
      { wrapper: Wrapper },
    );
    await waitFor(() =>
      expect(result.current.error).toBe('storage unavailable'),
    );

    expect(result.current.isReady).toBe(false);
    expect(mockedReadWatchlistOrder).toHaveBeenCalledTimes(
      WATCHLIST_ORDER_READ_RETRY_COUNT + 1,
    );
    mockedReadWatchlistOrder.mockResolvedValue([tokenA.key]);

    await act(async () => {
      await result.current.retry();
    });

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.error).toBeNull();
  });

  it('serializes overlapping writes and persists the newest order last', async () => {
    const tokenA = createToken('token:a');
    const tokenB = createToken('token:b');
    const tokenC = createToken('token:c');
    const firstOrder = [tokenB.key, tokenA.key, tokenC.key];
    const secondOrder = [tokenC.key, tokenB.key, tokenA.key];
    let persistedOrder: string[] = [];
    let resolveFirstWrite: (() => void) | undefined;
    let resolveSecondWrite: (() => void) | undefined;
    mockedWriteWatchlistOrder.mockImplementation((_accountGroupId, order) => {
      const completeWrite = (resolve: () => void) => {
        persistedOrder = [...order];
        resolve();
      };
      return new Promise<void>((resolve) => {
        if (!resolveFirstWrite) {
          resolveFirstWrite = () => completeWrite(resolve);
          return;
        }
        resolveSecondWrite = () => completeWrite(resolve);
      });
    });
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

    let firstWrite: Promise<void> = Promise.resolve();
    let secondWrite: Promise<void> = Promise.resolve();
    act(() => {
      firstWrite = result.current.persistOrder(firstOrder);
      secondWrite = result.current.persistOrder(secondOrder);
    });
    await waitFor(() =>
      expect(mockedWriteWatchlistOrder).toHaveBeenCalledTimes(1),
    );

    expect(mockedWriteWatchlistOrder).toHaveBeenLastCalledWith(
      'group-1',
      firstOrder,
    );

    await act(async () => {
      resolveFirstWrite?.();
      await firstWrite;
    });
    await waitFor(() =>
      expect(mockedWriteWatchlistOrder).toHaveBeenCalledTimes(2),
    );

    expect(mockedWriteWatchlistOrder).toHaveBeenLastCalledWith(
      'group-1',
      secondOrder,
    );

    await act(async () => {
      resolveSecondWrite?.();
      await secondWrite;
    });

    expect(persistedOrder).toEqual(secondOrder);
    expect(queryClient.getQueryData(['watchlist-order', 'group-1'])).toEqual(
      secondOrder,
    );
  });

  it('rolls back only its own failed optimistic order', async () => {
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
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await expect(
        result.current.persistOrder([tokenB.key, tokenA.key]),
      ).rejects.toThrow('write failed');
    });

    expect(queryClient.getQueryData(['watchlist-order', 'group-1'])).toEqual([
      tokenA.key,
      tokenB.key,
    ]);
  });

  it('preserves a newer optimistic order when an overlapping write fails', async () => {
    const tokenA = createToken('token:a');
    const tokenB = createToken('token:b');
    const tokenC = createToken('token:c');
    const firstOrder = [tokenB.key, tokenA.key, tokenC.key];
    const newestOrder = [tokenC.key, tokenB.key, tokenA.key];
    mockedWriteWatchlistOrder
      .mockRejectedValueOnce(new Error('first write failed'))
      .mockResolvedValueOnce(undefined);
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

    let firstWrite: Promise<void> = Promise.resolve();
    let newestWrite: Promise<void> = Promise.resolve();
    act(() => {
      firstWrite = result.current.persistOrder(firstOrder);
      newestWrite = result.current.persistOrder(newestOrder);
    });
    await act(async () => {
      await expect(firstWrite).rejects.toThrow('first write failed');
    });
    await act(async () => {
      await newestWrite;
    });

    expect(queryClient.getQueryData(['watchlist-order', 'group-1'])).toEqual(
      newestOrder,
    );
    expect(mockedWriteWatchlistOrder).toHaveBeenLastCalledWith(
      'group-1',
      newestOrder,
    );
  });
});
