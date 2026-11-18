import { AppState, type AppStateStatus } from 'react-native';
import { act, waitFor } from '@testing-library/react-native';
import { createUIQueryClient } from '@metamask/react-data-query';
import { __setMockNetInfo } from '../../../../../../__mocks__/@react-native-community/netinfo';
import { PACK_PARTNER_ENVIRONMENT } from '../constants';
import type {
  PackPartnerOpening,
  PackPartnerOpeningFilters,
} from '../types/openings';
import { renderHookWithQueryClient } from '../../../views/testUtils';
import {
  usePackPartnerOpenings,
  type PackPartnerOpeningsOptions,
} from './usePackPartnerOpenings';

const read = jest.fn<Promise<PackPartnerOpening[]>, unknown[]>();
const call = jest.fn(async (action: string, ...params: unknown[]) =>
  action === 'PackPartnerDataService:getRecentOpenings'
    ? read(...params)
    : null,
);
const opening = (n: number): PackPartnerOpening => ({
  id: String(n),
  mint: String(n),
  name: `Card ${n}`,
  openedAt: n,
});
const wins = (...values: number[]) => values.map(opening);
let onAppState: (status: AppStateStatus) => void;
const remove = jest.fn();
const advance = async (ms: number) => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
};
const renderFeed = (
  filters: PackPartnerOpeningFilters = {},
  options: PackPartnerOpeningsOptions = {},
) => {
  const props = { filters, options };
  const queryClient = createUIQueryClient(
    ['PackPartnerDataService'],
    { call, subscribe: jest.fn(), unsubscribe: jest.fn() },
    { defaultOptions: { queries: { gcTime: Infinity, retry: false } } },
  );
  const hook = renderHookWithQueryClient(
    () => usePackPartnerOpenings(props.filters, props.options),
    { queryClient },
  );
  return { ...hook, props };
};
const loaded = async (
  filters?: PackPartnerOpeningFilters,
  options?: PackPartnerOpeningsOptions,
) => {
  const hook = renderFeed(filters, options);
  await waitFor(() => expect(hook.result.current.data).toBeDefined());
  return hook;
};

describe('usePackPartnerOpenings polling contract', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    read.mockReset().mockResolvedValue(wins(2, 1));
    call.mockClear();
    remove.mockClear();
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'active',
    });
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_type, listener) => {
        onAppState = listener;
        return { remove };
      });
    __setMockNetInfo({
      type: 'wifi',
      isInternetReachable: true,
    });
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('shows the initial snapshot immediately, newest first, capped at twenty', async () => {
    read.mockResolvedValue(Array.from({ length: 25 }, (_, n) => opening(n)));

    const { result } = await loaded();

    expect(result.current.data?.map(({ id }) => id)).toEqual(
      Array.from({ length: 20 }, (_, n) => String(24 - n)),
    );
    expect(call).toHaveBeenCalledWith(
      'PackPartnerDataService:getRecentOpenings',
      PACK_PARTNER_ENVIRONMENT,
      { count: 20 },
    );
  });

  it('polls each second and inserts at most one queued opening per second', async () => {
    const { result } = await loaded();
    read.mockResolvedValue(wins(5, 4, 3, 2, 1));

    await advance(1_000);
    expect(read).toHaveBeenCalledTimes(2);
    expect(result.current.pendingCount).toBe(3);
    await advance(1_000);

    expect(result.current.data).toEqual(wins(3, 2, 1));
    expect(result.current.pendingCount).toBe(2);
  });

  it('continues polling while paused and resumes without inserting a burst', async () => {
    const { result } = await loaded();
    act(() => result.current.pause());
    read.mockResolvedValue(wins(5, 4, 3, 2, 1));

    await advance(4_000);
    expect(read).toHaveBeenCalledTimes(5);
    expect(result.current.data).toEqual(wins(2, 1));
    expect(result.current.pendingCount).toBe(3);
    act(() => result.current.resume());
    await advance(999);
    expect(result.current.data).toEqual(wins(2, 1));
    await advance(1);

    expect(result.current.data).toEqual(wins(3, 2, 1));
  });

  it('overrides the list bound and both intervals independently', async () => {
    const { result } = await loaded(
      {},
      { listLimit: 2, pollIntervalMs: 500, insertIntervalMs: 2_000 },
    );
    read.mockResolvedValue(wins(7, 6, 5, 4, 3, 2, 1));

    await advance(1_500);
    expect(read).toHaveBeenCalledTimes(4);
    expect(result.current.pendingCount).toBe(2);
    expect(result.current.data).toEqual(wins(2, 1));
    await advance(500);

    expect(result.current.data).toEqual(wins(6, 2));
    expect(call).toHaveBeenCalledWith(
      'PackPartnerDataService:getRecentOpenings',
      PACK_PARTNER_ENVIRONMENT,
      { count: 2 },
    );
  });

  it('does not enqueue duplicates or replay discarded older openings', async () => {
    const { result } = await loaded({}, { listLimit: 2 });
    read.mockResolvedValue(wins(5, 4, 3, 2));
    await advance(4_000);

    read.mockResolvedValue(wins(4, 3, 2, 1));
    await advance(3_000);

    expect(result.current.data).toEqual(wins(5, 4));
    expect(result.current.pendingCount).toBe(0);
  });

  it('queues arrivals after an empty initial snapshot', async () => {
    read.mockResolvedValue([]);
    const { result } = await loaded();
    act(() => result.current.pause());
    read.mockResolvedValue(wins(1));

    await advance(2_000);

    expect(result.current.data).toEqual([]);
    expect(result.current.pendingCount).toBe(1);
  });

  it('forwards every filter and count without inventing an API sort option', async () => {
    const filters = {
      packType: 'pokemon_50',
      timestamp: '2026-11-01T00:00:00Z',
      slug: 'mm',
      epic: false,
      count: 42,
      cursor: 'next',
      wallet: 'wallet',
      perTier: 2,
    };

    await loaded(filters);

    expect(call).toHaveBeenCalledWith(
      'PackPartnerDataService:getRecentOpenings',
      PACK_PARTNER_ENVIRONMENT,
      filters,
    );
  });

  it('keeps the feed on equivalent filters but resets it when the filters change', async () => {
    const { props, rerender, result } = await loaded({ packType: 'a' });
    act(() => result.current.pause());
    props.filters = { packType: 'a' };
    rerender({});
    expect(result.current.isPaused).toBe(true);
    read.mockResolvedValue(wins(9));

    props.filters = { packType: 'b' };
    rerender({});
    await waitFor(() => expect(result.current.data).toEqual(wins(9)));

    expect(result.current.isPaused).toBe(false);
    expect(result.current.pendingCount).toBe(0);
  });

  it('does not restore a previous filter insertion pause on return', async () => {
    const { props, result, rerender } = await loaded({ packType: 'a' });
    act(() => result.current.pause());
    props.filters = { packType: 'b' };
    rerender({});

    props.filters = { packType: 'a' };
    rerender({});

    expect(result.current.isPaused).toBe(false);
  });

  it('ignores an in-flight snapshot while disabled', async () => {
    const { props, result, rerender } = await loaded();
    let resolve: (data: PackPartnerOpening[]) => void = () => undefined;
    read.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await advance(1000);
    props.options.enabled = false;
    rerender({});

    await act(async () => resolve(wins(3, 2, 1)));
    await advance(2000);

    expect(result.current.data).toEqual(wins(2, 1));
    expect(result.current.pendingCount).toBe(0);
  });

  it('continues polling when connectivity is unknown', async () => {
    const { rerender } = await loaded();
    __setMockNetInfo({ type: 'unknown', isInternetReachable: null });
    rerender({});

    await advance(1000);

    expect(read).toHaveBeenCalledTimes(2);
  });

  it('ignores a late response from a previous filter', async () => {
    let resolveOld: (data: PackPartnerOpening[]) => void = () => undefined;
    read.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    );
    const { props, rerender, result } = renderFeed({ packType: 'old' });
    await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
    props.filters = { packType: 'new' };
    read.mockResolvedValue(wins(9));
    rerender({});
    await waitFor(() => expect(result.current.data).toEqual(wins(9)));

    await act(async () => resolveOld(wins(1)));
    await advance(2_000);

    expect(result.current.data).toEqual(wins(9));
  });

  it.each(['disabled', 'background', 'offline', 'unmounted'] as const)(
    'stops polling and insertions when %s',
    async (reason) => {
      const { props, rerender, result, unmount } = await loaded();
      read.mockResolvedValue(wins(3, 2, 1));
      await advance(1_000);
      if (reason === 'disabled') {
        props.options.enabled = false;
        rerender({});
      }
      if (reason === 'background') act(() => onAppState('background'));
      if (reason === 'offline')
        act(() =>
          __setMockNetInfo({
            type: 'none',
            isInternetReachable: false,
          }),
        );
      if (reason === 'offline') rerender({});
      if (reason === 'unmounted') unmount();
      const reads = read.mock.calls.length;

      await advance(5_000);

      expect(read).toHaveBeenCalledTimes(reads);
      if (reason !== 'unmounted')
        expect(result.current.data).toEqual(wins(2, 1));
      else expect(remove).toHaveBeenCalledTimes(1);
    },
  );

  it('does not read on mount in the background', async () => {
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'background',
    });
    renderFeed();

    await advance(5_000);

    expect(read).not.toHaveBeenCalled();
  });

  it('resumes polling on foreground and preserves the insertion pause', async () => {
    const { result } = await loaded();
    act(() => {
      result.current.pause();
      onAppState('background');
    });
    read.mockResolvedValue(wins(3, 2, 1));

    act(() => onAppState('active'));
    await advance(2_000);

    expect(result.current.data).toEqual(wins(2, 1));
    expect(result.current.pendingCount).toBe(1);
  });

  it('does not overlap slow reads', async () => {
    read.mockReturnValue(new Promise(() => undefined));
    renderFeed();

    await advance(5_000);

    expect(read).toHaveBeenCalledTimes(1);
  });

  it('keeps displayed cards when a refresh fails', async () => {
    const { result } = await loaded();
    read.mockRejectedValue(new Error('offline'));

    await advance(2_000);

    expect(result.current.data).toEqual(wins(2, 1));
  });
});
