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

  it('skips the callback on refocus within the throttle window', () => {
    const callback = jest.fn();
    renderHook(() => useThrottledFocusEffect(callback, THROTTLE_MS));

    focusCallback();
    jest.advanceTimersByTime(60_000); // 1 minute — still within window
    focusCallback();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('skips the callback on refocus within the window even after a blur', () => {
    // The throttle clock is not reset on blur — blur/refocus from bottom
    // sheets or tab switches within the window are still throttled.
    const callback = jest.fn();
    renderHook(() => useThrottledFocusEffect(callback, THROTTLE_MS));

    const cleanup = focusCallback();
    jest.advanceTimersByTime(60_000);
    cleanup?.(); // blur
    focusCallback(); // refocus within window — still skipped

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('runs the callback again after the throttle window has elapsed', () => {
    const callback = jest.fn();
    renderHook(() => useThrottledFocusEffect(callback, THROTTLE_MS));

    focusCallback();
    jest.advanceTimersByTime(THROTTLE_MS);
    focusCallback();

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('passes through the cleanup function returned by the callback', () => {
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

    focusCallback();
    jest.advanceTimersByTime(60_000);
    const returnedCleanup = focusCallback(); // skipped

    expect(returnedCleanup).toBeUndefined();
    expect(cleanup).not.toHaveBeenCalled();
  });

  it('respects a custom throttle window', () => {
    const callback = jest.fn();
    renderHook(() => useThrottledFocusEffect(callback, 10_000));

    focusCallback();
    jest.advanceTimersByTime(5_000); // within 10s window
    focusCallback();
    expect(callback).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(5_000); // now at 10s — window elapsed
    focusCallback();
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
