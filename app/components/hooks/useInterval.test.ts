import { renderHook } from '@testing-library/react-hooks';
import useInterval from './useInterval';

describe('useInterval', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  it('should not start interval if delay is null', () => {
    const callback = jest.fn();
    renderHook(() => useInterval(callback, { delay: null }));

    jest.advanceTimersByTime(1000);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should start interval with specified delay', () => {
    const callback = jest.fn();
    renderHook(() => useInterval(callback, { delay: 1000 }));

    jest.advanceTimersByTime(3000);

    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('should execute callback immediately when immediate is true', () => {
    const callback = jest.fn();
    renderHook(() => useInterval(callback, { delay: 1000, immediate: true }));

    expect(callback).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should not execute callback immediately when immediate is false', () => {
    const callback = jest.fn();
    renderHook(() => useInterval(callback, { delay: 1000, immediate: false }));

    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should clear interval on unmount', () => {
    const callback = jest.fn();
    const { unmount } = renderHook(() =>
      useInterval(callback, { delay: 1000 }),
    );

    unmount();

    jest.advanceTimersByTime(1000);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should update interval when delay changes', () => {
    const callback = jest.fn();
    const { rerender } = renderHook(
      ({ delay }) => useInterval(callback, { delay }),
      {
        initialProps: { delay: 1000 },
      },
    );

    jest.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    rerender({ delay: 500 });

    jest.advanceTimersByTime(500);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should not start interval if delay is 0 or negative', () => {
    const callback = jest.fn();
    renderHook(() => useInterval(callback, { delay: 0 }));

    jest.advanceTimersByTime(1000);

    expect(callback).not.toHaveBeenCalled();

    renderHook(() => useInterval(callback, { delay: -1000 }));

    jest.advanceTimersByTime(1000);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should handle callback changes without resetting interval', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    const { rerender } = renderHook(
      ({ cb }) => useInterval(cb, { delay: 1000 }),
      {
        initialProps: { cb: callback1 },
      },
    );

    jest.advanceTimersByTime(1000);
    expect(callback1).toHaveBeenCalledTimes(1);

    rerender({ cb: callback2 });
    jest.advanceTimersByTime(1000);
    expect(callback2).toHaveBeenCalledTimes(1);
    expect(callback1).toHaveBeenCalledTimes(1);
  });

  it('should handle undefined delay', () => {
    const callback = jest.fn();
    renderHook(() => useInterval(callback, {}));

    jest.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();
  });
});
