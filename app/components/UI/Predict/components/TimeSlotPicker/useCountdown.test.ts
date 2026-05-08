import { renderHook, act } from '@testing-library/react-hooks';
import { useCountdown } from './useCountdown';

describe('useCountdown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-09T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns formatted MM:SS for a future target date', () => {
    const target = new Date('2026-04-09T12:05:30.000Z').toISOString();

    const { result } = renderHook(() => useCountdown(target));

    expect(result.current).toBe('05:30');
  });

  it('returns null when target date is in the past', () => {
    const target = new Date('2026-04-09T11:59:00.000Z').toISOString();

    const { result } = renderHook(() => useCountdown(target));

    expect(result.current).toBeNull();
  });

  it('returns null when target date is undefined', () => {
    const { result } = renderHook(() => useCountdown(undefined));

    expect(result.current).toBeNull();
  });

  it('decrements every second', () => {
    const target = new Date('2026-04-09T12:00:03.000Z').toISOString();

    const { result } = renderHook(() => useCountdown(target));

    expect(result.current).toBe('00:03');

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current).toBe('00:02');

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current).toBe('00:01');
  });

  it('transitions to null when countdown reaches zero', () => {
    const target = new Date('2026-04-09T12:00:01.000Z').toISOString();

    const { result } = renderHook(() => useCountdown(target));

    expect(result.current).toBe('00:01');

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current).toBeNull();
  });

  it('pads single-digit minutes and seconds with leading zeros', () => {
    const target = new Date('2026-04-09T12:01:05.000Z').toISOString();

    const { result } = renderHook(() => useCountdown(target));

    expect(result.current).toBe('01:05');
  });

  it('resets when targetDate changes', () => {
    const target1 = new Date('2026-04-09T12:00:10.000Z').toISOString();
    const target2 = new Date('2026-04-09T12:02:00.000Z').toISOString();

    const { result, rerender } = renderHook(
      ({ target }) => useCountdown(target),
      { initialProps: { target: target1 } },
    );

    expect(result.current).toBe('00:10');

    rerender({ target: target2 });

    expect(result.current).toBe('02:00');
  });

  it('handles large countdown values', () => {
    const target = new Date('2026-04-09T13:30:00.000Z').toISOString();

    const { result } = renderHook(() => useCountdown(target));

    expect(result.current).toBe('90:00');
  });
});
