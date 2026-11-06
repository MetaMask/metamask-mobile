import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { captureException } from '@sentry/react-native';
import { RewardsMoneyHttpError } from '../../../../core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';
import { useCursorPaginatedList } from './useCursorPaginatedList';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

const focusRegistrations: {
  effect: () => void | (() => void);
  cleanup?: () => void;
}[] = [];

jest.mock('@react-navigation/native', () => {
  const React = jest.requireActual('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) => {
      React.useEffect(() => {
        const registration: (typeof focusRegistrations)[number] = { effect };
        const cleanup = effect();
        if (typeof cleanup === 'function') {
          registration.cleanup = cleanup;
        }
        focusRegistrations.push(registration);
        return () => {
          const index = focusRegistrations.indexOf(registration);
          if (index >= 0) {
            focusRegistrations.splice(index, 1);
          }
          registration.cleanup?.();
        };
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
    focusRegistrations.splice(0, focusRegistrations.length);
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

  it('retries a failed later page after the wait and does not ask again from the list end', async () => {
    (captureException as jest.Mock).mockClear();
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(PAGE_1)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(PAGE_2);

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

    jest.useFakeTimers();
    try {
      act(() => {
        result.current.loadMore();
      });
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.error).toBe('boom');
      expect(result.current.items).toEqual(PAGE_1.results);
      expect(fetchPage).toHaveBeenCalledTimes(2);

      act(() => {
        result.current.loadMore();
      });
      expect(fetchPage).toHaveBeenCalledTimes(2);

      await act(async () => {
        jest.advanceTimersByTime(1999);
        await Promise.resolve();
      });
      expect(fetchPage).toHaveBeenCalledTimes(2);

      await act(async () => {
        jest.advanceTimersByTime(1);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(fetchPage).toHaveBeenCalledTimes(3);
      expect(fetchPage).toHaveBeenLastCalledWith({
        cursor: 'c2',
        isFirstPage: false,
        forceFresh: false,
      });
      expect(result.current.error).toBeNull();
      expect(result.current.items).toEqual([{ id: '1' }, { id: '2' }]);
      expect(captureException).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('waits out Retry-After before asking for a failed later page again', async () => {
    const busy = new RewardsMoneyHttpError('busy', 503, undefined, 5);
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(PAGE_1)
      .mockRejectedValueOnce(busy)
      .mockResolvedValueOnce(PAGE_2);

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

    jest.useFakeTimers();
    try {
      act(() => {
        result.current.loadMore();
      });
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(fetchPage).toHaveBeenCalledTimes(2);

      await act(async () => {
        jest.advanceTimersByTime(4999);
        await Promise.resolve();
      });
      expect(fetchPage).toHaveBeenCalledTimes(2);

      await act(async () => {
        jest.advanceTimersByTime(1);
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(fetchPage).toHaveBeenCalledTimes(3);
      expect(fetchPage).toHaveBeenLastCalledWith({
        cursor: 'c2',
        isFirstPage: false,
        forceFresh: false,
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('asks once for a waiting later page when the screen is focused again', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(PAGE_1)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(PAGE_2);

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

    jest.useFakeTimers();
    try {
      act(() => {
        result.current.loadMore();
      });
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(fetchPage).toHaveBeenCalledTimes(2);

      act(() => {
        focusRegistrations.forEach((registration) => {
          registration.cleanup?.();
        });
      });

      await act(async () => {
        jest.advanceTimersByTime(30_000);
        await Promise.resolve();
      });
      expect(fetchPage).toHaveBeenCalledTimes(2);

      await act(async () => {
        focusRegistrations.forEach((registration) => {
          const cleanup = registration.effect();
          if (typeof cleanup === 'function') {
            registration.cleanup = cleanup;
          }
        });
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(fetchPage).toHaveBeenCalledTimes(3);
      expect(fetchPage).toHaveBeenLastCalledWith({
        cursor: 'c2',
        isFirstPage: false,
        forceFresh: false,
      });
      expect(result.current.error).toBeNull();
      expect(result.current.items).toEqual([{ id: '1' }, { id: '2' }]);
    } finally {
      jest.useRealTimers();
    }
  });

  it('asks once on the next focus when a later page fails while blurred', async () => {
    (captureException as jest.Mock).mockClear();
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(PAGE_1)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(PAGE_2);

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

    jest.useFakeTimers();
    try {
      act(() => {
        focusRegistrations.forEach((registration) => {
          registration.cleanup?.();
        });
      });

      act(() => {
        result.current.loadMore();
      });
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.error).toBe('boom');
      expect(fetchPage).toHaveBeenCalledTimes(2);
      expect(captureException).not.toHaveBeenCalled();

      act(() => {
        result.current.loadMore();
      });
      expect(fetchPage).toHaveBeenCalledTimes(2);

      await act(async () => {
        jest.advanceTimersByTime(30_000);
        await Promise.resolve();
      });
      expect(fetchPage).toHaveBeenCalledTimes(2);

      await act(async () => {
        focusRegistrations.forEach((registration) => {
          const cleanup = registration.effect();
          if (typeof cleanup === 'function') {
            registration.cleanup = cleanup;
          }
        });
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(fetchPage).toHaveBeenCalledTimes(3);
      expect(fetchPage).toHaveBeenLastCalledWith({
        cursor: 'c2',
        isFirstPage: false,
        forceFresh: false,
      });
      expect(result.current.error).toBeNull();
      expect(captureException).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('reports a later page the server refused while the screen is blurred', async () => {
    (captureException as jest.Mock).mockClear();
    const refused = new RewardsMoneyHttpError('nope', 400);
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(PAGE_1)
      .mockRejectedValue(refused);

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
      focusRegistrations.forEach((registration) => {
        registration.cleanup?.();
      });
    });
    act(() => {
      result.current.loadMore();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.error).toBe('nope');
    expect(captureException).toHaveBeenCalledTimes(1);

    act(() => {
      focusRegistrations.forEach((registration) => {
        const cleanup = registration.effect();
        if (typeof cleanup === 'function') {
          registration.cleanup = cleanup;
        }
      });
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('does not retry a later page the server refused', async () => {
    (captureException as jest.Mock).mockClear();
    const refused = new RewardsMoneyHttpError('nope', 400);
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(PAGE_1)
      .mockRejectedValue(refused);

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

    jest.useFakeTimers();
    try {
      act(() => {
        result.current.loadMore();
      });
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.error).toBe('nope');
      expect(captureException).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(30_000);
        await Promise.resolve();
      });
      expect(fetchPage).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('stops retrying a failed later page after four paced attempts', async () => {
    (captureException as jest.Mock).mockClear();
    const stuck = new Error('boom');
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(PAGE_1)
      .mockRejectedValue(stuck);

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

    jest.useFakeTimers();
    try {
      act(() => {
        result.current.loadMore();
      });
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      const waits = [2_000, 4_000, 8_000, 16_000];
      for (const wait of waits) {
        await act(async () => {
          jest.advanceTimersByTime(wait);
          await Promise.resolve();
          await Promise.resolve();
        });
      }

      expect(fetchPage).toHaveBeenCalledTimes(6);
      expect(captureException).toHaveBeenCalledTimes(1);
      expect(captureException).toHaveBeenCalledWith(stuck, {
        tags: {
          feature: 'rewards',
          context: 'cursorPaginatedList.fetch_failed',
        },
      });

      await act(async () => {
        jest.advanceTimersByTime(30_000);
        await Promise.resolve();
      });
      expect(fetchPage).toHaveBeenCalledTimes(6);
      expect(result.current.items).toEqual(PAGE_1.results);
    } finally {
      jest.useRealTimers();
    }
  });

  it('retries a failed load-more with the same cursor', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(PAGE_1)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(PAGE_2);

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

    jest.useFakeTimers();
    try {
      act(() => {
        result.current.loadMore();
      });
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.error).toBe('boom');

      await act(async () => {
        await result.current.retry();
        await Promise.resolve();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.items).toEqual([{ id: '1' }, { id: '2' }]);
      expect(fetchPage).toHaveBeenLastCalledWith({
        cursor: 'c2',
        isFirstPage: false,
        forceFresh: false,
      });
      expect(fetchPage).not.toHaveBeenCalledWith({
        cursor: null,
        isFirstPage: true,
        forceFresh: true,
      });

      await act(async () => {
        jest.advanceTimersByTime(30_000);
        await Promise.resolve();
      });
      expect(fetchPage).toHaveBeenCalledTimes(3);
    } finally {
      jest.useRealTimers();
    }
  });

  it('retries a failed first page from the start', async () => {
    const fetchPage = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(PAGE_1);

    const { result } = renderHook(() =>
      useCursorPaginatedList<Item>({
        enabled: true,
        resetKey: 'key',
        feature: 'rewards',
        fetchPage,
      }),
    );

    await waitFor(() => {
      expect(result.current.error).toBe('boom');
    });

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.items).toEqual(PAGE_1.results);
    });

    expect(result.current.error).toBeNull();
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

  it('keeps cache visible without a loading state while the first page is in flight', async () => {
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

    expect(result.current.isLoading).toBe(false);
    expect(result.current.items).toEqual(cached);
    expect(result.current.error).toBeNull();

    await act(async () => {
      resolveFetch(PAGE_1);
    });

    await waitFor(() => {
      expect(result.current.items).toEqual(PAGE_1.results);
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('reports loading while the first page is in flight and there is no cache', async () => {
    let resolveFetch: (value: typeof PAGE_1) => void = () => undefined;
    const fetchPage = jest.fn(
      () =>
        new Promise<typeof PAGE_1>((resolve) => {
          resolveFetch = resolve;
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
      expect(fetchPage).toHaveBeenCalled();
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.items).toBeNull();

    await act(async () => {
      resolveFetch(PAGE_1);
    });

    await waitFor(() => {
      expect(result.current.items).toEqual(PAGE_1.results);
    });
  });

  it('keeps cache and reports the error when a first-page fetch fails', async () => {
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
    expect(result.current.error).toBe('boom');
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
