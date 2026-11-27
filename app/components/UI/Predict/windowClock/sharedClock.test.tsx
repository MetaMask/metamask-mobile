import { act, renderHook } from '@testing-library/react-native';
import {
  __resetCardClockForTest,
  useSharedBucketedNowMs,
  useSharedNowMs,
  useSharedSeriesWindowMs,
} from './sharedClock';

const NOW = new Date('2026-11-26T23:07:30.000Z');

describe('sharedClock', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    __resetCardClockForTest();
  });

  afterEach(() => {
    __resetCardClockForTest();
    jest.useRealTimers();
  });

  it('ticks about once per second while a component subscribes', () => {
    const { result } = renderHook(() => useSharedNowMs());
    const first = result.current;

    act(() => {
      jest.advanceTimersByTime(2_100);
    });

    expect(result.current - first).toBeGreaterThanOrEqual(2_000);
  });

  it('stops its timer when the last subscriber unmounts', () => {
    const { unmount } = renderHook(() => useSharedNowMs());
    expect(jest.getTimerCount()).toBe(1);

    unmount();

    expect(jest.getTimerCount()).toBe(0);
  });

  it('shares one timer between subscribers', () => {
    renderHook(() => useSharedNowMs());
    renderHook(() => useSharedNowMs());

    expect(jest.getTimerCount()).toBe(1);
  });

  it('returns the start of the aligned window', () => {
    const { result } = renderHook(() =>
      useSharedSeriesWindowMs(15 * 60 * 1000),
    );

    expect(result.current).toBe(Date.parse('2026-11-26T23:00:00.000Z'));
  });

  it('returns the time rounded down to the bucket', () => {
    const { result } = renderHook(() => useSharedBucketedNowMs(60_000));

    expect(result.current).toBe(Date.parse('2026-11-26T23:07:00.000Z'));
  });
});
