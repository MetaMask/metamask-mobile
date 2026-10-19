import { renderHook } from '@testing-library/react-native';
import type { RefreshConfig } from './useExploreRefresh';
import { useFeedRefresh } from './useFeedRefresh';

const createRefresh = (trigger: number): RefreshConfig => ({
  trigger,
  silentRefresh: true,
});

describe('useFeedRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips the initial refresh trigger', () => {
    const refetch = jest.fn(() => Promise.resolve());

    renderHook(() => useFeedRefresh(createRefresh(0), refetch));

    expect(refetch).not.toHaveBeenCalled();
  });

  it('refetches for a nonzero trigger when enabled', () => {
    const refetch = jest.fn(() => Promise.resolve());

    renderHook(() => useFeedRefresh(createRefresh(1), refetch));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('refetches when the trigger increments', () => {
    const refetch = jest.fn(() => Promise.resolve());
    const { rerender } = renderHook(
      ({ refresh }) => useFeedRefresh(refresh, refetch),
      {
        initialProps: { refresh: createRefresh(0) },
      },
    );

    rerender({ refresh: createRefresh(1) });

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('does not replay a consumed trigger when becoming enabled', () => {
    const refetch = jest.fn(() => Promise.resolve());
    const refresh = createRefresh(1);
    const { rerender } = renderHook(
      ({ enabled }) => useFeedRefresh(refresh, refetch, enabled),
      {
        initialProps: { enabled: false },
      },
    );

    rerender({ enabled: true });

    expect(refetch).not.toHaveBeenCalled();
  });

  it('ignores a new refresh object when its trigger is unchanged', () => {
    const refetch = jest.fn(() => Promise.resolve());
    const { rerender } = renderHook(
      ({ refresh }) => useFeedRefresh(refresh, refetch),
      {
        initialProps: { refresh: createRefresh(1) },
      },
    );

    rerender({ refresh: createRefresh(1) });

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('refetches when a new trigger arrives after becoming enabled', () => {
    const refetch = jest.fn(() => Promise.resolve());
    const { rerender } = renderHook(
      ({ enabled, refresh }) => useFeedRefresh(refresh, refetch, enabled),
      {
        initialProps: {
          enabled: false,
          refresh: createRefresh(1),
        },
      },
    );

    rerender({ enabled: true, refresh: createRefresh(2) });

    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
