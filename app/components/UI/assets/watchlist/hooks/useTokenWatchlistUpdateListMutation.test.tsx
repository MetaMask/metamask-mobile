import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notifyManager } from '@tanstack/query-core';
import type { CaipAssetType } from '@metamask/utils';

import {
  EMPTY_BLOB,
  readFromTokenWatchList,
  type WatchlistBlob,
  writeToTokenWatchList,
} from '../storage';
import { tokenWatchlistQueryKeys } from './useTokenWatchlist.keys';
import {
  tokenWatchlistUpdateBatcher,
  useTokenWatchlistUpdateListMutation,
} from './useTokenWatchlistUpdateListMutation';

// Override React Query's batch notify function to prevent teardown crashes.
// The default uses react-native's unstable_batchedUpdates which tries to
// require() internal modules after the Jest environment is torn down.
notifyManager.setBatchNotifyFunction((callback: () => void) => {
  callback();
});

jest.mock('../storage', () => ({
  __esModule: true,
  EMPTY_BLOB: { assets: [], version: 1 },
  readFromTokenWatchList: jest.fn(),
  writeToTokenWatchList: jest.fn(),
}));

const mockedRead = readFromTokenWatchList as jest.MockedFunction<
  typeof readFromTokenWatchList
>;
const mockedWrite = writeToTokenWatchList as jest.MockedFunction<
  typeof writeToTokenWatchList
>;

let activeQueryClient: QueryClient | null = null;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: Infinity },
      mutations: { retry: false },
    },
  });
  activeQueryClient = queryClient;
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { Wrapper, queryClient };
};

const ASSET_A = 'eip155:1/erc20:0xaaa' as CaipAssetType;
const ASSET_B = 'eip155:1/erc20:0xbbb' as CaipAssetType;
const ASSET_C = 'eip155:1/erc20:0xccc' as CaipAssetType;

describe('useTokenWatchlistUpdateListMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tokenWatchlistUpdateBatcher.cancel();
    mockedRead.mockResolvedValue(EMPTY_BLOB);
    mockedWrite.mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (activeQueryClient) {
      activeQueryClient.getMutationCache().clear();
      activeQueryClient.getQueryCache().clear();
      activeQueryClient.clear();
      activeQueryClient = null;
    }
  });

  it('writes the supplied list as the new ordering', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTokenWatchlistUpdateListMutation(), {
      wrapper: Wrapper,
    });

    const newOrder = [ASSET_C, ASSET_A, ASSET_B];

    let mutationResult: WatchlistBlob | undefined;
    await act(async () => {
      const pending = result.current.mutateAsync(newOrder);
      await tokenWatchlistUpdateBatcher.flush();
      mutationResult = await pending;
    });

    expect(mockedWrite).toHaveBeenCalledTimes(1);
    expect(mockedWrite).toHaveBeenCalledWith({
      assets: [ASSET_C, ASSET_A, ASSET_B],
      version: 1,
    });
    expect(mutationResult).toStrictEqual({
      assets: [ASSET_C, ASSET_A, ASSET_B],
      version: 1,
    });
  });

  it('preserves blob fields outside of `assets` when writing the new ordering', async () => {
    mockedRead.mockResolvedValue({
      assets: [ASSET_A, ASSET_B],
      version: 1,
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTokenWatchlistUpdateListMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      const pending = result.current.mutateAsync([ASSET_B, ASSET_A]);
      await tokenWatchlistUpdateBatcher.flush();
      await pending;
    });

    expect(mockedWrite).toHaveBeenCalledWith({
      assets: [ASSET_B, ASSET_A],
      version: 1,
    });
  });

  it('optimistically replaces the blob cache before the storage write completes', async () => {
    let resolveWrite: (() => void) | null = null;
    mockedWrite.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveWrite = () => resolve();
        }),
    );

    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData<WatchlistBlob>(tokenWatchlistQueryKeys.blob, {
      assets: [ASSET_A, ASSET_B, ASSET_C],
      version: 1,
    });

    const { result } = renderHook(() => useTokenWatchlistUpdateListMutation(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.mutate([ASSET_C, ASSET_A, ASSET_B]);
    });

    await waitFor(() =>
      expect(
        queryClient.getQueryData<WatchlistBlob>(tokenWatchlistQueryKeys.blob),
      ).toStrictEqual({
        assets: [ASSET_C, ASSET_A, ASSET_B],
        version: 1,
      }),
    );
    expect(mockedWrite).not.toHaveBeenCalled();

    const flushPromise = tokenWatchlistUpdateBatcher.flush();
    await waitFor(() => expect(mockedWrite).toHaveBeenCalledTimes(1));
    expect(resolveWrite).not.toBeNull();

    await act(async () => {
      (resolveWrite as () => void)();
      await flushPromise;
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  it('rolls back the optimistic ordering when the storage write fails', async () => {
    const failure = new Error('write failed');
    mockedWrite.mockRejectedValue(failure);

    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData<WatchlistBlob>(tokenWatchlistQueryKeys.blob, {
      assets: [ASSET_A, ASSET_B, ASSET_C],
      version: 1,
    });

    const { result } = renderHook(() => useTokenWatchlistUpdateListMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      const pending = result.current.mutateAsync([ASSET_C, ASSET_A, ASSET_B]);
      await tokenWatchlistUpdateBatcher.flush().catch(() => undefined);
      await expect(pending).rejects.toBe(failure);
    });

    expect(
      queryClient.getQueryData<WatchlistBlob>(tokenWatchlistQueryKeys.blob),
    ).toStrictEqual({ assets: [ASSET_A, ASSET_B, ASSET_C], version: 1 });
  });

  it('coalesces rapid reorder updates into a single last-write-wins storage write', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useTokenWatchlistUpdateListMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      const pending = Promise.all([
        result.current.mutateAsync([ASSET_A, ASSET_B, ASSET_C]),
        result.current.mutateAsync([ASSET_B, ASSET_A, ASSET_C]),
        result.current.mutateAsync([ASSET_C, ASSET_B, ASSET_A]),
      ]);
      await tokenWatchlistUpdateBatcher.flush();
      await pending;
    });

    expect(mockedWrite).toHaveBeenCalledTimes(1);
    expect(mockedWrite).toHaveBeenCalledWith({
      assets: [ASSET_C, ASSET_B, ASSET_A],
      version: 1,
    });
    expect(
      queryClient.getQueryData<WatchlistBlob>(tokenWatchlistQueryKeys.blob),
    ).toStrictEqual({ assets: [ASSET_C, ASSET_B, ASSET_A], version: 1 });
  });

  it('invalidates the watchlist blob query once the batch drains', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useTokenWatchlistUpdateListMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      const pending = result.current.mutateAsync([ASSET_A]);
      await tokenWatchlistUpdateBatcher.flush();
      await pending;
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: tokenWatchlistQueryKeys.blob,
    });
  });
});
