import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { captureException } from '@sentry/react-native';
import { RewardsMoneyHttpError } from '../../../../core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';
import { useCursorPaginatedList } from './useCursorPaginatedList';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const React = jest.requireActual('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) => {
      React.useEffect(() => {
        const cleanup = effect();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, [effect]);
    },
  };
});

interface Item {
  id: string;
}

const PAGE_1 = {
  results: [{ id: '1' }],
  has_more: true,
  cursor: 'c2',
};

const PAGE_2 = {
  results: [{ id: '2' }],
  has_more: false,
  cursor: null,
};

describe('useCursorPaginatedList', () => {
  beforeEach(() => {
    jest
      .spyOn(globalThis.crypto, 'getRandomValues')
      .mockImplementation((array) => {
        if (array instanceof Uint32Array) {
          array[0] = 0;
        }
        return array;
      });
  });

  it('does not fetch when disabled', () => {
    const fetchPage = jest.fn();

    const { result } = renderHook(() =>
      useCursorPaginatedList<Item>({
        enabled: false,
        resetKey: 'key',
        feature: 'rewards',
        fetchPage,
      }),
    );

    expect(fetchPage).not.toHaveBeenCalled();
    expect(result.current.items).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('fetches first page and calls onFirstPage', async () => {
    const fetchPage = jest.fn().mockResolvedValue(PAGE_1);
    const onFirstPage = jest.fn();

    const { result } = renderHook(() =>
      useCursorPaginatedList<Item>({
        enabled: true,
        resetKey: 'key',
        feature: 'rewards',
        fetchPage,
        onFirstPage,
      }),
    );

    await waitFor(() => {
      expect(result.current.items).toEqual(PAGE_1.results);
    });

    expect(fetchPage).toHaveBeenCalledWith({
      cursor: null,
      isFirstPage: true,
      forceFresh: false,
    });
    expect(onFirstPage).toHaveBeenCalledWith(PAGE_1.results);
    expect(result.current.hasMore).toBe(true);
  });

  it('appends loadMore results without calling onFirstPage again', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(PAGE_1)
      .mockResolvedValueOnce(PAGE_2);
    const onFirstPage = jest.fn();

    const { result } = renderHook(() =>
      useCursorPaginatedList<Item>({
        enabled: true,
        resetKey: 'key',
        feature: 'rewards',
        fetchPage,
        onFirstPage,
      }),
    );

    await waitFor(() => {
      expect(result.current.hasMore).toBe(true);
    });

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.hasMore).toBe(false);
    });

    expect(result.current.items).toEqual([{ id: '1' }, { id: '2' }]);
    expect(onFirstPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenLastCalledWith({
      cursor: 'c2',
      isFirstPage: false,
      forceFresh: false,
    });
  });

  it('does not loadMore when hasMore is false', async () => {
    const fetchPage = jest.fn().mockResolvedValue({
      ...PAGE_1,
      has_more: false,
      cursor: null,
    });

    const { result } = renderHook(() =>
      useCursorPaginatedList<Item>({
        enabled: true,
        resetKey: 'key',
        feature: 'rewards',
        fetchPage,
      }),
    );

    await waitFor(() => {
      expect(result.current.hasMore).toBe(false);
    });

    act(() => {
      result.current.loadMore();
    });

    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('surfaces non-empty cached items immediately when disabled', () => {
    const cached = [{ id: 'cached' }];

    const { result } = renderHook(() =>
      useCursorPaginatedList<Item>({
        enabled: false,
        resetKey: 'key',
        feature: 'rewards',
        cachedItems: cached,
        fetchPage: jest.fn(),
      }),
    );

    expect(result.current.items).toEqual(cached);
  });

  it('ignores empty cached lists for display', () => {
    const { result } = renderHook(() =>
      useCursorPaginatedList<Item>({
        enabled: false,
        resetKey: 'key',
        feature: 'rewards',
        cachedItems: [],
        fetchPage: jest.fn(),
      }),
    );

    expect(result.current.items).toBeNull();
  });

  it('refresh force-fetches first page and sets isRefreshing', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(PAGE_1)
      .mockResolvedValueOnce({
        results: [{ id: 'fresh' }],
        has_more: false,
        cursor: null,
      });

    const { result } = renderHook(() =>
      useCursorPaginatedList<Item>({
        enabled: true,
        resetKey: 'key',
        feature: 'rewards',
        fetchPage,
      }),
    );

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
    });

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(false);
    });

    expect(fetchPage).toHaveBeenLastCalledWith({
      cursor: null,
      isFirstPage: true,
      forceFresh: true,
    });
    expect(result.current.items?.[0].id).toBe('fresh');
  });

  it('retry force-fetches without setting isRefreshing', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(PAGE_1)
      .mockResolvedValueOnce({
        results: [{ id: 'retry' }],
        has_more: false,
        cursor: null,
      });

    const { result } = renderHook(() =>
      useCursorPaginatedList<Item>({
        enabled: true,
        resetKey: 'key',
        feature: 'rewards',
        fetchPage,
      }),
    );

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
    });

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.items?.[0].id).toBe('retry');
    });

    expect(result.current.isRefreshing).toBe(false);
    expect(fetchPage).toHaveBeenLastCalledWith({
      cursor: null,
      isFirstPage: true,
      forceFresh: true,
    });
  });

  it('sets error on fetch failure when there is no cache', async () => {
    const fetchPage = jest.fn().mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() =>
      useCursorPaginatedList<Item>({
        enabled: true,
        resetKey: 'key',
        feature: 'rewards',
        fetchPage,
        errorMessage: 'fallback',
      }),
    );

    await waitFor(() => {
      expect(result.current.error).toBe('boom');
    });

    expect(result.current.items).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('refetches a short busy failure once and does not arm again', async () => {
    jest.useFakeTimers();
    (captureException as jest.Mock).mockClear();
    try {
      const busy = new RewardsMoneyHttpError('busy', 503, undefined, 2);
      const fetchPage = jest
        .fn()
        .mockRejectedValueOnce(busy)
        .mockRejectedValueOnce(busy);

      const { result } = renderHook(() =>
        useCursorPaginatedList<Item>({
          enabled: true,
          resetKey: 'key',
          feature: 'rewards',
          fetchPage,
        }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.error).toBe('busy');
      expect(fetchPage).toHaveBeenCalledTimes(1);
      expect(captureException).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(fetchPage).toHaveBeenCalledTimes(2);
      expect(fetchPage).toHaveBeenLastCalledWith({
        cursor: null,
        isFirstPage: true,
        forceFresh: true,
      });

      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(fetchPage).toHaveBeenCalledTimes(2);
      expect(captureException).toHaveBeenCalledTimes(1);
      expect(captureException).toHaveBeenCalledWith(busy, {
        tags: {
          feature: 'rewards',
          context: 'cursorPaginatedList.fetch_failed',
        },
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('refetches a 30 second busy failure once and does not arm again', async () => {
    jest.useFakeTimers();
    (captureException as jest.Mock).mockClear();
    try {
      const busy = new RewardsMoneyHttpError('busy', 503, undefined, 30);
      const fetchPage = jest
        .fn()
        .mockRejectedValueOnce(busy)
        .mockRejectedValueOnce(busy);

      const { result } = renderHook(() =>
        useCursorPaginatedList<Item>({
          enabled: true,
          resetKey: 'key',
          feature: 'rewards',
          fetchPage,
        }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.error).toBe('busy');
      expect(fetchPage).toHaveBeenCalledTimes(1);
      expect(captureException).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(30_000);
        await Promise.resolve();
      });

      expect(fetchPage).toHaveBeenCalledTimes(2);
      expect(captureException).toHaveBeenCalledTimes(1);
      expect(captureException).toHaveBeenCalledWith(busy, {
        tags: {
          feature: 'rewards',
          context: 'cursorPaginatedList.fetch_failed',
        },
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not refetch a busy failure whose Retry-After is over 30 seconds', async () => {
    jest.useFakeTimers();
    (captureException as jest.Mock).mockClear();
    try {
      const fetchPage = jest
        .fn()
        .mockRejectedValue(
          new RewardsMoneyHttpError('busy', 503, undefined, 31),
        );

      const { result } = renderHook(() =>
        useCursorPaginatedList<Item>({
          enabled: true,
          resetKey: 'key',
          feature: 'rewards',
          fetchPage,
        }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.error).toBe('busy');
      expect(captureException).toHaveBeenCalledTimes(1);
      expect(captureException).toHaveBeenCalledWith(expect.any(Error), {
        tags: {
          feature: 'rewards',
          context: 'cursorPaginatedList.fetch_failed',
        },
      });

      await act(async () => {
        jest.advanceTimersByTime(32_000);
        await Promise.resolve();
      });

      expect(fetchPage).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('hides cache while a first-page load is in flight', async () => {
    let resolveFetch: (value: typeof PAGE_1) => void = () => undefined;
    const fetchPage = jest.fn(
      () =>
        new Promise<typeof PAGE_1>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const cached = [{ id: 'cached' }];

    const { result } = renderHook(() =>
      useCursorPaginatedList<Item>({
        enabled: true,
        resetKey: 'key',
        feature: 'rewards',
        cachedItems: cached,
        fetchPage,
      }),
    );

    await waitFor(() => {
      expect(fetchPage).toHaveBeenCalled();
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.items).toBeNull();
    expect(result.current.error).toBeNull();

    await act(async () => {
      resolveFetch(PAGE_1);
    });

    await waitFor(() => {
      expect(result.current.items).toEqual(PAGE_1.results);
    });
  });

  it('shows cache and suppresses error when first-page fetch fails', async () => {
    const fetchPage = jest.fn().mockRejectedValue(new Error('boom'));
    const cached = [{ id: 'cached' }];

    const { result } = renderHook(() =>
      useCursorPaginatedList<Item>({
        enabled: true,
        resetKey: 'key',
        feature: 'rewards',
        cachedItems: cached,
        fetchPage,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items).toEqual(cached);
    expect(result.current.error).toBeNull();
  });

  it('keeps current rows visible during pull-to-refresh', async () => {
    let resolveRefresh: (value: {
      results: Item[];
      has_more: boolean;
      cursor: string | null;
    }) => void = () => undefined;
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(PAGE_1)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve;
          }),
      );

    const { result } = renderHook(() =>
      useCursorPaginatedList<Item>({
        enabled: true,
        resetKey: 'key',
        feature: 'rewards',
        fetchPage,
      }),
    );

    await waitFor(() => {
      expect(result.current.items).toEqual(PAGE_1.results);
    });

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(true);
    });

    expect(result.current.items).toEqual(PAGE_1.results);
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      resolveRefresh({
        results: [{ id: 'fresh' }],
        has_more: false,
        cursor: null,
      });
    });

    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(false);
    });

    expect(result.current.items?.[0].id).toBe('fresh');
  });

  it('refetches when resetKey changes', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(PAGE_1)
      .mockResolvedValueOnce({
        results: [{ id: 'other' }],
        has_more: false,
        cursor: null,
      });

    const { result, rerender } = renderHook(
      ({ resetKey }: { resetKey: string }) =>
        useCursorPaginatedList<Item>({
          enabled: true,
          resetKey,
          feature: 'rewards',
          fetchPage,
        }),
      { initialProps: { resetKey: 'a' } },
    );

    await waitFor(() => {
      expect(result.current.items?.[0].id).toBe('1');
    });

    rerender({ resetKey: 'b' });

    await waitFor(() => {
      expect(result.current.items?.[0].id).toBe('other');
    });

    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('clears isRefreshing when resetKey changes during an in-flight refresh', async () => {
    let resolveRefresh: (value: typeof PAGE_1) => void = () => undefined;
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(PAGE_1)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve;
          }),
      )
      .mockResolvedValueOnce({
        results: [{ id: 'switched' }],
        has_more: false,
        cursor: null,
      });

    const { result, rerender } = renderHook(
      ({ resetKey }: { resetKey: string }) =>
        useCursorPaginatedList<Item>({
          enabled: true,
          resetKey,
          feature: 'rewards',
          fetchPage,
        }),
      { initialProps: { resetKey: 'a' } },
    );

    await waitFor(() => {
      expect(result.current.items).toEqual(PAGE_1.results);
    });

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(true);
    });

    rerender({ resetKey: 'b' });

    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(false);
    });

    await act(async () => {
      resolveRefresh(PAGE_1);
    });

    await waitFor(() => {
      expect(result.current.items?.[0].id).toBe('switched');
    });

    expect(result.current.isRefreshing).toBe(false);
  });
});
