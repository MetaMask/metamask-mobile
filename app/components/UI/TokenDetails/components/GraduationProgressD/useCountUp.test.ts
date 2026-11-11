import { act, renderHook } from '@testing-library/react-native';

import { createCubicBezierEasing, useCountUp } from './useCountUp';

const LINEAR_EASING = (t: number): number => t;

const options = {
  mountDurationMs: 800,
  deltaDurationMs: 300,
  frameMs: 16,
  reducedMotion: false,
  easing: LINEAR_EASING,
};

describe('createCubicBezierEasing', () => {
  it('maps the easing endpoints exactly', () => {
    const easing = createCubicBezierEasing(0.2, 0.8, 0.2, 1);

    expect(easing(0)).toBe(0);
    expect(easing(1)).toBe(1);
  });

  it('produces a fast-start curve for the mount control points', () => {
    const easing = createCubicBezierEasing(0.2, 0.8, 0.2, 1);

    expect(easing(0.25)).toBeGreaterThan(0.5);
    expect(easing(0.25)).toBeLessThan(easing(0.5));
  });
});

describe('useCountUp', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('jumps straight to the target under reduced motion', () => {
    const { result } = renderHook(() =>
      useCountUp(94, { ...options, reducedMotion: true }),
    );

    expect(result.current).toBe(94);
  });

  it('starts at zero and counts up to the target over the mount duration', () => {
    const { result } = renderHook(() => useCountUp(94, options));

    expect(result.current).toBe(0);

    act(() => {
      jest.advanceTimersByTime(16);
    });
    const afterOneFrame = result.current;
    expect(afterOneFrame).toBeGreaterThan(0);
    expect(afterOneFrame).toBeLessThan(94);

    act(() => {
      jest.advanceTimersByTime(800);
    });
    expect(result.current).toBe(94);
  });

  it('never overshoots the target', () => {
    const { result } = renderHook(() => useCountUp(94, options));

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current).toBe(94);
    expect(result.current).toBeLessThanOrEqual(94);
  });

  it('animates a later target change over the delta duration, from the current value', () => {
    const { result, rerender } = renderHook(
      ({ target }: { target: number }) => useCountUp(target, options),
      { initialProps: { target: 40 } },
    );

    act(() => {
      jest.advanceTimersByTime(800);
    });
    expect(result.current).toBe(40);

    rerender({ target: 60 });

    act(() => {
      jest.advanceTimersByTime(16);
    });
    const afterDeltaFrame = result.current;
    expect(afterDeltaFrame).toBeGreaterThan(40);
    expect(afterDeltaFrame).toBeLessThan(60);

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe(60);
  });

  it('hands off mid-animation to a new target without a visual jump', () => {
    const { result, rerender } = renderHook(
      ({ target }: { target: number }) => useCountUp(target, options),
      { initialProps: { target: 40 } },
    );

    act(() => {
      jest.advanceTimersByTime(16 * 10);
    });
    const midFlight = result.current;
    expect(midFlight).toBeGreaterThan(0);
    expect(midFlight).toBeLessThan(40);

    rerender({ target: 90 });

    act(() => {
      jest.advanceTimersByTime(16);
    });
    expect(result.current).toBeGreaterThanOrEqual(midFlight);

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe(90);
  });

  it('schedules no timers when the target does not change', () => {
    const { result, rerender } = renderHook(
      ({ target }: { target: number }) => useCountUp(target, options),
      { initialProps: { target: 40 } },
    );

    act(() => {
      jest.advanceTimersByTime(800);
    });

    rerender({ target: 40 });

    expect(jest.getTimerCount()).toBe(0);
    expect(result.current).toBe(40);
  });

  it('stops ticking after unmount', () => {
    const { unmount } = renderHook(() => useCountUp(94, options));

    act(() => {
      jest.advanceTimersByTime(16);
    });
    expect(jest.getTimerCount()).toBe(1);

    unmount();

    expect(jest.getTimerCount()).toBe(0);
  });
});
