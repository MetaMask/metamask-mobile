import { renderHook, act } from '@testing-library/react-hooks';
import { Dimensions } from 'react-native';
import { useIsInViewport } from './useIsInViewport';

const SCREEN_HEIGHT = Dimensions.get('window').height;

describe('useIsInViewport', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const attachRef = (
    hook: ReturnType<typeof useIsInViewport>,
    y: number,
    height: number,
  ) => {
    (hook.ref as { current: unknown }).current = {
      measureInWindow: jest.fn(
        (cb: (x: number, y: number, w: number, h: number) => void) => {
          cb(0, y, 300, height);
        },
      ),
    };
  };

  it('starts as not in viewport', () => {
    const { result } = renderHook(() => useIsInViewport());
    expect(result.current.isInViewport).toBe(false);
  });

  it('reports visible when component is on screen after onLayout', () => {
    const { result } = renderHook(() => useIsInViewport());
    attachRef(result.current, 100, 200);

    act(() => {
      result.current.onLayout();
    });

    expect(result.current.isInViewport).toBe(true);
  });

  it('reports not visible when component is off screen', () => {
    const { result } = renderHook(() => useIsInViewport());
    attachRef(result.current, SCREEN_HEIGHT + 500, 200);

    act(() => {
      result.current.onLayout();
    });

    expect(result.current.isInViewport).toBe(false);
  });

  it('toggles visibility on subsequent poll intervals', () => {
    const { result } = renderHook(() =>
      useIsInViewport({ pollIntervalMs: 100 }),
    );

    attachRef(result.current, SCREEN_HEIGHT + 500, 200);

    act(() => {
      result.current.onLayout();
    });
    expect(result.current.isInViewport).toBe(false);

    attachRef(result.current, 100, 200);

    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current.isInViewport).toBe(true);

    attachRef(result.current, SCREEN_HEIGHT + 500, 200);

    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current.isInViewport).toBe(false);
  });

  it('respects custom areaThreshold', () => {
    const { result } = renderHook(() =>
      useIsInViewport({ areaThreshold: 0.8 }),
    );
    // Only 50px of 200px visible => 25% < 80% threshold
    attachRef(result.current, SCREEN_HEIGHT - 50, 200);

    act(() => {
      result.current.onLayout();
    });

    expect(result.current.isInViewport).toBe(false);
  });

  it('clears interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    const { result, unmount } = renderHook(() => useIsInViewport());
    attachRef(result.current, 100, 200);

    act(() => {
      result.current.onLayout();
    });

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
