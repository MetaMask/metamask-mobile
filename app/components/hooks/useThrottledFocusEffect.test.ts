import { renderHook } from '@testing-library/react-hooks';
import { useFocusEffect } from '@react-navigation/native';
import { useThrottledFocusEffect } from './useThrottledFocusEffect';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
  typeof useFocusEffect
>;

const THROTTLE_MS = 300_000; // 5 minutes

describe('useThrottledFocusEffect', () => {
  let focusCallback: () => (() => void) | void;

  beforeEach(() => {
    jest.useFakeTimers();
    mockUseFocusEffect.mockImplementation((cb) => {
      focusCallback = cb;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('runs the callback on the first focus', () => {
    const callback = jest.fn();
    renderHook(() => useThrottledFocusEffect(callback, THROTTLE_MS));

    focusCallback();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('skips the callback when the effect re-runs without a blur within the throttle window', () => {
    // Simulates the inner useCallback being re-registered while the screen
    // stays focused (e.g. throttleMs changes), causing useFocusEffect to
    // re-run the effect body without calling cleanup first.
    const callback = jest.fn();
    renderHook(() => useThrottledFocusEffect(callback, THROTTLE_MS));

    focusCallback(); // effect runs — no cleanup called before next run
    jest.advanceTimersByTime(60_000); // 1 minute later, still within window
    focusCallback(); // effect re-runs without blur — should be skipped

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('runs the callback again after the throttle window has elapsed (no blur between focuses)', () => {
    const callback = jest.fn();
    renderHook(() => useThrottledFocusEffect(callback, THROTTLE_MS));

    focusCallback(); // first run — no cleanup called before next
    jest.advanceTimersByTime(THROTTLE_MS); // window expires
    focusCallback(); // re-runs without blur — window elapsed so should run

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('returns the cleanup function from the callback', () => {
    const cleanup = jest.fn();
    const callback = jest.fn().mockReturnValue(cleanup);
    renderHook(() => useThrottledFocusEffect(callback, THROTTLE_MS));

    const returnedCleanup = focusCallback();
    returnedCleanup?.();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('does not return a cleanup when the throttle skips the callback', () => {
    const cleanup = jest.fn();
    const callback = jest.fn().mockReturnValue(cleanup);
    renderHook(() => useThrottledFocusEffect(callback, THROTTLE_MS));

    focusCallback(); // runs
    jest.advanceTimersByTime(60_000);
    const returnedCleanup = focusCallback(); // skipped

    expect(returnedCleanup).toBeUndefined();
    expect(cleanup).not.toHaveBeenCalled();
  });

  it('restarts after blur even within the throttle window', () => {
    const callback = jest.fn();
    renderHook(() => useThrottledFocusEffect(callback, THROTTLE_MS));

    const cleanup = focusCallback(); // focus — runs
    jest.advanceTimersByTime(60_000);
    cleanup?.(); // blur — resets throttle
    focusCallback(); // refocus within window — should run again

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('respects a custom throttle window', () => {
    const callback = jest.fn();
    renderHook(() => useThrottledFocusEffect(callback, 10_000));

    focusCallback();
    jest.advanceTimersByTime(5_000); // within 10s window
    focusCallback();
    expect(callback).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(5_000); // now at 10s, window elapsed
    focusCallback();
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
