import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { FEED_NOW_TICK_MS, useFeedNow } from './useFeedNow';

describe('useFeedNow', () => {
  const t0 = 1_700_000_000_000;
  let appState: AppStateStatus;
  let listeners: ((state: AppStateStatus) => void)[];

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(t0);
    appState = 'active';
    listeners = [];
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, handler) => {
        listeners.push(handler as (state: AppStateStatus) => void);
        return { remove: jest.fn() };
      });
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => appState,
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('does not advance now when enabled is false', () => {
    const { result } = renderHook(() =>
      useFeedNow({ enabled: false, dataUpdatedAt: t0 }),
    );

    act(() => {
      jest.advanceTimersByTime(FEED_NOW_TICK_MS);
    });

    expect(result.current).toBe(t0);
  });

  it('does not advance now while the app is backgrounded', () => {
    appState = 'background';

    const { result } = renderHook(() =>
      useFeedNow({ enabled: true, dataUpdatedAt: t0 }),
    );

    act(() => {
      jest.advanceTimersByTime(FEED_NOW_TICK_MS);
    });

    expect(result.current).toBe(t0);
  });

  it('advances now on each tick while enabled and foregrounded', () => {
    const { result } = renderHook(() =>
      useFeedNow({ enabled: true, dataUpdatedAt: t0 }),
    );

    act(() => {
      jest.advanceTimersByTime(FEED_NOW_TICK_MS);
    });

    expect(result.current).toBe(t0 + FEED_NOW_TICK_MS);
  });

  it('snaps now on the same render when dataUpdatedAt changes', () => {
    const { result, rerender } = renderHook(
      ({ dataUpdatedAt }: { dataUpdatedAt: number }) =>
        useFeedNow({ enabled: true, dataUpdatedAt }),
      { initialProps: { dataUpdatedAt: t0 } },
    );

    act(() => {
      jest.setSystemTime(t0 + 10_000);
      rerender({ dataUpdatedAt: t0 + 10_000 });
    });

    expect(result.current).toBe(t0 + 10_000);
  });

  it('snaps now on the same render when the Feed tab becomes enabled', () => {
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useFeedNow({ enabled, dataUpdatedAt: t0 }),
      { initialProps: { enabled: false } },
    );

    act(() => {
      jest.setSystemTime(t0 + 600_000);
      rerender({ enabled: true });
    });

    expect(result.current).toBe(t0 + 600_000);
  });

  it('snaps now on the same render when the app returns to the foreground', () => {
    appState = 'background';
    const { result } = renderHook(() =>
      useFeedNow({ enabled: true, dataUpdatedAt: t0 }),
    );

    act(() => {
      jest.setSystemTime(t0 + 600_000);
      listeners.forEach((listener) => listener('active'));
    });

    expect(result.current).toBe(t0 + 600_000);
  });
});
