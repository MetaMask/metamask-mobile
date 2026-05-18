import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  QueryClient,
  QueryClientProvider,
  type UseMutationResult,
} from '@tanstack/react-query';
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
  tokenWatchlistAddBatcher,
  tokenWatchlistRemoveBatcher,
  tokenWatchlistUpdateBatcher,
  useTokenWatchlistAddItemMutation,
  useTokenWatchlistRemoveItemMutation,
  useTokenWatchlistUpdateListMutation,
} from './useTokenWatchlistMutations';

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

const ASSET_A = 'eip155:1/erc20:0xaaa' as CaipAssetType;
const ASSET_B = 'eip155:1/erc20:0xbbb' as CaipAssetType;
const ASSET_C = 'eip155:1/erc20:0xccc' as CaipAssetType;

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

const seedCache = (queryClient: QueryClient, blob: WatchlistBlob) =>
  queryClient.setQueryData<WatchlistBlob>(tokenWatchlistQueryKeys.blob, blob);

const readCache = (queryClient: QueryClient) =>
  queryClient.getQueryData<WatchlistBlob>(tokenWatchlistQueryKeys.blob);

const baseAfterEach = () => {
  if (activeQueryClient) {
    activeQueryClient.getMutationCache().clear();
    activeQueryClient.getQueryCache().clear();
    activeQueryClient.clear();
    activeQueryClient = null;
  }
};

interface MutationScenario<TInput> {
  name: string;
  useHook: () => UseMutationResult<WatchlistBlob, Error, TInput, unknown>;
  batcher: { flush: () => Promise<unknown>; cancel: () => void };
  initialCache: WatchlistBlob;
  initialStorage: WatchlistBlob;
  input: TInput;
  expectedOptimisticAssets: string[];
  expectedWrittenAssets: string[];
}

const scenarios: MutationScenario<unknown>[] = [
  {
    name: 'add',
    useHook: useTokenWatchlistAddItemMutation,
    batcher: tokenWatchlistAddBatcher,
    initialCache: { assets: [ASSET_A], version: 1 },
    initialStorage: { assets: [ASSET_A], version: 1 },
    input: ASSET_B,
    expectedOptimisticAssets: [ASSET_A, ASSET_B],
    expectedWrittenAssets: [ASSET_A, ASSET_B],
  } as MutationScenario<unknown>,
  {
    name: 'remove',
    useHook: useTokenWatchlistRemoveItemMutation,
    batcher: tokenWatchlistRemoveBatcher,
    initialCache: { assets: [ASSET_A, ASSET_B, ASSET_C], version: 1 },
    initialStorage: { assets: [ASSET_A, ASSET_B, ASSET_C], version: 1 },
    input: ASSET_B,
    expectedOptimisticAssets: [ASSET_A, ASSET_C],
    expectedWrittenAssets: [ASSET_A, ASSET_C],
  } as MutationScenario<unknown>,
  {
    name: 'update',
    useHook: useTokenWatchlistUpdateListMutation,
    batcher: tokenWatchlistUpdateBatcher,
    initialCache: { assets: [ASSET_A, ASSET_B, ASSET_C], version: 1 },
    initialStorage: { assets: [ASSET_A, ASSET_B, ASSET_C], version: 1 },
    input: [ASSET_C, ASSET_A, ASSET_B],
    expectedOptimisticAssets: [ASSET_C, ASSET_A, ASSET_B],
    expectedWrittenAssets: [ASSET_C, ASSET_A, ASSET_B],
  } as MutationScenario<unknown>,
];

describe.each(scenarios)('useTokenWatchlist $name mutation', (scenario) => {
  beforeEach(() => {
    jest.clearAllMocks();
    scenario.batcher.cancel();
    mockedRead.mockResolvedValue(scenario.initialStorage);
    mockedWrite.mockResolvedValue(undefined);
  });

  afterEach(baseAfterEach);

  it('writes the expected blob to storage and resolves the mutation with it', async () => {
    const { Wrapper, queryClient } = createWrapper();
    seedCache(queryClient, scenario.initialCache);

    const { result } = renderHook(() => scenario.useHook(), {
      wrapper: Wrapper,
    });

    let mutationResult: WatchlistBlob | undefined;
    await act(async () => {
      const pending = result.current.mutateAsync(scenario.input);
      await scenario.batcher.flush();
      mutationResult = await pending;
    });

    expect(mockedWrite).toHaveBeenCalledTimes(1);
    expect(mockedWrite).toHaveBeenCalledWith({
      assets: scenario.expectedWrittenAssets,
      version: 1,
    });
    expect(mutationResult).toStrictEqual({
      assets: scenario.expectedWrittenAssets,
      version: 1,
    });
  });

  it('optimistically updates the blob cache before the storage write completes', async () => {
    let resolveWrite: (() => void) | null = null;
    mockedWrite.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveWrite = () => resolve();
        }),
    );

    const { Wrapper, queryClient } = createWrapper();
    seedCache(queryClient, scenario.initialCache);

    const { result } = renderHook(() => scenario.useHook(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.mutate(scenario.input);
    });

    await waitFor(() =>
      expect(readCache(queryClient)).toStrictEqual({
        assets: scenario.expectedOptimisticAssets,
        version: 1,
      }),
    );
    expect(mockedWrite).not.toHaveBeenCalled();

    const flushPromise = scenario.batcher.flush();
    await waitFor(() => expect(mockedWrite).toHaveBeenCalledTimes(1));
    expect(resolveWrite).not.toBeNull();

    await act(async () => {
      (resolveWrite as () => void)();
      await flushPromise;
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  it('rolls back the optimistic cache update when the storage write fails', async () => {
    const failure = new Error('write failed');
    mockedWrite.mockRejectedValue(failure);

    const { Wrapper, queryClient } = createWrapper();
    seedCache(queryClient, scenario.initialCache);

    const { result } = renderHook(() => scenario.useHook(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      const pending = result.current.mutateAsync(scenario.input);
      await scenario.batcher.flush().catch(() => undefined);
      await expect(pending).rejects.toBe(failure);
    });

    expect(readCache(queryClient)).toStrictEqual(scenario.initialCache);
  });

  it('invalidates the watchlist blob query once the batcher drains', async () => {
    const { Wrapper, queryClient } = createWrapper();
    seedCache(queryClient, scenario.initialCache);
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => scenario.useHook(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      const pending = result.current.mutateAsync(scenario.input);
      await scenario.batcher.flush();
      await pending;
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: tokenWatchlistQueryKeys.blob,
    });
  });
});

describe('useTokenWatchlistAddItemMutation (specifics)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tokenWatchlistAddBatcher.cancel();
    mockedRead.mockResolvedValue(EMPTY_BLOB);
    mockedWrite.mockResolvedValue(undefined);
  });

  afterEach(baseAfterEach);

  it('appends multiple asset ids passed as an array and de-duplicates against existing assets', async () => {
    mockedRead.mockResolvedValue({ assets: [ASSET_A], version: 1 });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTokenWatchlistAddItemMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      const pending = result.current.mutateAsync([ASSET_A, ASSET_B, ASSET_C]);
      await tokenWatchlistAddBatcher.flush();
      await pending;
    });

    expect(mockedWrite).toHaveBeenCalledWith({
      assets: [ASSET_A, ASSET_B, ASSET_C],
      version: 1,
    });
  });

  it('coalesces concurrent add calls into a single storage write', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useTokenWatchlistAddItemMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      const pending = Promise.all([
        result.current.mutateAsync(ASSET_A),
        result.current.mutateAsync(ASSET_B),
        result.current.mutateAsync(ASSET_C),
      ]);
      await tokenWatchlistAddBatcher.flush();
      await pending;
    });

    expect(mockedRead).toHaveBeenCalledTimes(1);
    expect(mockedWrite).toHaveBeenCalledTimes(1);
    expect(mockedWrite).toHaveBeenCalledWith({
      assets: [ASSET_A, ASSET_B, ASSET_C],
      version: 1,
    });
    expect(readCache(queryClient)).toStrictEqual({
      assets: [ASSET_A, ASSET_B, ASSET_C],
      version: 1,
    });
  });
});

describe('useTokenWatchlistRemoveItemMutation (specifics)', () => {
  const initial: WatchlistBlob = {
    assets: [ASSET_A, ASSET_B, ASSET_C],
    version: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    tokenWatchlistRemoveBatcher.cancel();
    mockedRead.mockResolvedValue(initial);
    mockedWrite.mockResolvedValue(undefined);
  });

  afterEach(baseAfterEach);

  it('removes multiple asset ids passed as an array', async () => {
    const { Wrapper, queryClient } = createWrapper();
    seedCache(queryClient, initial);

    const { result } = renderHook(() => useTokenWatchlistRemoveItemMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      const pending = result.current.mutateAsync([ASSET_A, ASSET_C]);
      await tokenWatchlistRemoveBatcher.flush();
      await pending;
    });

    expect(mockedWrite).toHaveBeenCalledWith({
      assets: [ASSET_B],
      version: 1,
    });
  });

  it('is a no-op against ids that are not in the persisted blob', async () => {
    const { Wrapper, queryClient } = createWrapper();
    seedCache(queryClient, initial);

    const { result } = renderHook(() => useTokenWatchlistRemoveItemMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      const pending = result.current.mutateAsync(
        'eip155:1/erc20:0xdoesnotexist' as CaipAssetType,
      );
      await tokenWatchlistRemoveBatcher.flush();
      await pending;
    });

    expect(mockedWrite).toHaveBeenCalledWith(initial);
  });

  it('coalesces concurrent remove calls into a single storage write', async () => {
    const { Wrapper, queryClient } = createWrapper();
    seedCache(queryClient, initial);

    const { result } = renderHook(() => useTokenWatchlistRemoveItemMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      const pending = Promise.all([
        result.current.mutateAsync(ASSET_A),
        result.current.mutateAsync(ASSET_C),
      ]);
      await tokenWatchlistRemoveBatcher.flush();
      await pending;
    });

    expect(mockedRead).toHaveBeenCalledTimes(1);
    expect(mockedWrite).toHaveBeenCalledTimes(1);
    expect(mockedWrite).toHaveBeenCalledWith({
      assets: [ASSET_B],
      version: 1,
    });
    expect(readCache(queryClient)).toStrictEqual({
      assets: [ASSET_B],
      version: 1,
    });
  });
});

describe('useTokenWatchlistUpdateListMutation (specifics)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tokenWatchlistUpdateBatcher.cancel();
    mockedRead.mockResolvedValue(EMPTY_BLOB);
    mockedWrite.mockResolvedValue(undefined);
  });

  afterEach(baseAfterEach);

  it('preserves blob fields outside of `assets` when writing the new ordering', async () => {
    mockedRead.mockResolvedValue({ assets: [ASSET_A, ASSET_B], version: 1 });

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
    expect(readCache(queryClient)).toStrictEqual({
      assets: [ASSET_C, ASSET_B, ASSET_A],
      version: 1,
    });
  });
});
