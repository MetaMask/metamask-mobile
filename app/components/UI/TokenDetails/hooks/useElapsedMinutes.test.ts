import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import {
  ELAPSED_MINUTES_TICK_MS,
  useElapsedMinutes,
} from './useElapsedMinutes';

describe('useElapsedMinutes', () => {
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

  const advance = (ms: number) =>
    act(() => {
      jest.advanceTimersByTime(ms);
    });

  // Distinct from the unfetched case below: the caller words this as "just
  // now", so it must not collapse into the same `null`.
  it('returns zero below one minute', () => {
    const { result } = renderHook(() =>
      useElapsedMinutes({ since: t0, enabled: true }),
    );

    expect(result.current).toBe(0);

    advance(59_000);

    expect(result.current).toBe(0);
  });

  it('returns whole minutes once a minute has passed', () => {
    const { result } = renderHook(() =>
      useElapsedMinutes({ since: t0, enabled: true }),
    );

    advance(60_000);

    expect(result.current).toBe(1);
  });

  it('advances on each tick', () => {
    const { result } = renderHook(() =>
      useElapsedMinutes({ since: t0, enabled: true }),
    );

    advance(5 * 60_000);
    expect(result.current).toBe(5);

    advance(60_000);
    expect(result.current).toBe(6);
  });

  it('floors a partial minute rather than rounding up', () => {
    const { result } = renderHook(() =>
      useElapsedMinutes({ since: t0, enabled: true }),
    );

    advance(119_000);

    expect(result.current).toBe(1);
  });

  it.each([undefined, 0])(
    'returns null for an unfetched since of %p',
    (since) => {
      const { result } = renderHook(() =>
        useElapsedMinutes({ since, enabled: true }),
      );

      advance(5 * 60_000);

      expect(result.current).toBeNull();
    },
  );

  it('does not tick while disabled', () => {
    const { result } = renderHook(() =>
      useElapsedMinutes({ since: t0, enabled: false }),
    );

    advance(5 * ELAPSED_MINUTES_TICK_MS);

    // Still the mount-time reading, rather than the two and a half minutes
    // that actually elapsed.
    expect(result.current).toBe(0);
  });

  it('does not tick while the app is backgrounded', () => {
    appState = 'background';

    const { result } = renderHook(() =>
      useElapsedMinutes({ since: t0, enabled: true }),
    );

    advance(5 * 60_000);

    expect(result.current).toBe(0);
  });

  // Returning to the app after a long pause should show the real age on the
  // first painted frame, not the figure from before the pause.
  it('snaps to the current age when the app returns to the foreground', () => {
    appState = 'background';

    const { result } = renderHook(() =>
      useElapsedMinutes({ since: t0, enabled: true }),
    );

    advance(10 * 60_000);
    expect(result.current).toBe(0);

    act(() => {
      appState = 'active';
      listeners.forEach((listener) => listener('active'));
    });

    expect(result.current).toBe(10);
  });

  it('snaps when the measured instant changes, as on a refetch', () => {
    const { result, rerender } = renderHook(
      ({ since }: { since: number }) =>
        useElapsedMinutes({ since, enabled: true }),
      { initialProps: { since: t0 } },
    );

    advance(10 * 60_000);
    expect(result.current).toBe(10);

    // A revalidation five minutes ago replaces the entry's timestamp.
    rerender({ since: t0 + 5 * 60_000 });

    expect(result.current).toBe(5);
  });

  // `Date.now()` is wall-clock, so a backwards correction must not produce a
  // negative age.
  it('clamps a since in the future to zero rather than going negative', () => {
    const { result } = renderHook(() =>
      useElapsedMinutes({ since: t0 + 10 * 60_000, enabled: true }),
    );

    advance(60_000);

    expect(result.current).toBe(0);
  });
});
