import { renderHook, act } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { useViewportTracking } from './useViewportTracking';

const mockTrace = jest.fn();
const mockEndTrace = jest.fn();
jest.mock('../../../../util/trace', () => ({
  ...jest.requireActual('../../../../util/trace'),
  trace: (...args: unknown[]) => mockTrace(...args),
  endTrace: (...args: unknown[]) => mockEndTrace(...args),
}));

jest.useFakeTimers();

const SCREEN_HEIGHT = Dimensions.get('window').height;

describe('useViewportTracking', () => {
  afterEach(() => {
    jest.clearAllTimers();
    mockTrace.mockClear();
    mockEndTrace.mockClear();
  });

  it('fires callback when component is fully visible on layout', () => {
    const onVisible = jest.fn();
    const { result } = renderHook(() => useViewportTracking(onVisible));

    const mockMeasureInWindow = jest.fn(
      (cb: (x: number, y: number, w: number, h: number) => void) => {
        cb(0, 100, 300, 100);
      },
    );
    (result.current.ref as { current: unknown }).current = {
      measureInWindow: mockMeasureInWindow,
    };

    act(() => {
      result.current.onLayout();
    });

    expect(onVisible).toHaveBeenCalledTimes(1);
  });

  it('does not fire callback when component is off screen', () => {
    const onVisible = jest.fn();
    const { result } = renderHook(() => useViewportTracking(onVisible));

    const mockMeasureInWindow = jest.fn(
      (cb: (x: number, y: number, w: number, h: number) => void) => {
        cb(0, SCREEN_HEIGHT + 500, 300, 100);
      },
    );
    (result.current.ref as { current: unknown }).current = {
      measureInWindow: mockMeasureInWindow,
    };

    act(() => {
      result.current.onLayout();
    });

    expect(onVisible).not.toHaveBeenCalled();
  });

  it('does not fire when less than 50% of the component is visible', () => {
    const onVisible = jest.fn();
    const { result } = renderHook(() => useViewportTracking(onVisible));

    const mockMeasureInWindow = jest.fn(
      (cb: (x: number, y: number, w: number, h: number) => void) => {
        cb(0, SCREEN_HEIGHT - 40, 300, 100);
      },
    );
    (result.current.ref as { current: unknown }).current = {
      measureInWindow: mockMeasureInWindow,
    };

    act(() => {
      result.current.onLayout();
    });

    expect(onVisible).not.toHaveBeenCalled();
  });

  it('fires when at least 50% of the component is visible', () => {
    const onVisible = jest.fn();
    const { result } = renderHook(() => useViewportTracking(onVisible));

    const mockMeasureInWindow = jest.fn(
      (cb: (x: number, y: number, w: number, h: number) => void) => {
        cb(0, SCREEN_HEIGHT - 60, 300, 100);
      },
    );
    (result.current.ref as { current: unknown }).current = {
      measureInWindow: mockMeasureInWindow,
    };

    act(() => {
      result.current.onLayout();
    });

    expect(onVisible).toHaveBeenCalledTimes(1);
  });

  it('fires callback when component scrolls into view via polling', () => {
    const onVisible = jest.fn();
    const { result } = renderHook(() => useViewportTracking(onVisible));

    let y = SCREEN_HEIGHT + 500;
    const mockMeasureInWindow = jest.fn(
      (cb: (x: number, _y: number, w: number, h: number) => void) => {
        cb(0, y, 300, 100);
      },
    );
    (result.current.ref as { current: unknown }).current = {
      measureInWindow: mockMeasureInWindow,
    };

    act(() => {
      result.current.onLayout();
    });

    expect(onVisible).not.toHaveBeenCalled();

    y = 100;
    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(onVisible).toHaveBeenCalledTimes(1);
  });

  it('fires callback only once', () => {
    const onVisible = jest.fn();
    const { result } = renderHook(() => useViewportTracking(onVisible));

    const mockMeasureInWindow = jest.fn(
      (cb: (x: number, y: number, w: number, h: number) => void) => {
        cb(0, 100, 300, 100);
      },
    );
    (result.current.ref as { current: unknown }).current = {
      measureInWindow: mockMeasureInWindow,
    };

    act(() => {
      result.current.onLayout();
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(onVisible).toHaveBeenCalledTimes(1);
  });

  it('does not fire callback when measured height is zero', () => {
    const onVisible = jest.fn();
    const { result } = renderHook(() => useViewportTracking(onVisible));

    const mockMeasureInWindow = jest.fn(
      (cb: (x: number, y: number, w: number, h: number) => void) => {
        cb(0, 100, 300, 0);
      },
    );
    (result.current.ref as { current: unknown }).current = {
      measureInWindow: mockMeasureInWindow,
    };

    act(() => {
      result.current.onLayout();
    });

    expect(onVisible).not.toHaveBeenCalled();
  });

  it('uses custom areaThreshold when provided', () => {
    const onVisible = jest.fn();
    const { result } = renderHook(() => useViewportTracking(onVisible, 0.9));

    const mockMeasureInWindow = jest.fn(
      (cb: (x: number, y: number, w: number, h: number) => void) => {
        cb(0, SCREEN_HEIGHT - 60, 300, 100);
      },
    );
    (result.current.ref as { current: unknown }).current = {
      measureInWindow: mockMeasureInWindow,
    };

    act(() => {
      result.current.onLayout();
    });

    // 60% visible but threshold is 90%, should not fire
    expect(onVisible).not.toHaveBeenCalled();
  });

  it('cleans up interval on unmount', () => {
    const onVisible = jest.fn();
    const { result, unmount } = renderHook(() =>
      useViewportTracking(onVisible),
    );

    const mockMeasureInWindow = jest.fn(
      (cb: (x: number, y: number, w: number, h: number) => void) => {
        cb(0, SCREEN_HEIGHT + 500, 300, 100);
      },
    );
    (result.current.ref as { current: unknown }).current = {
      measureInWindow: mockMeasureInWindow,
    };

    act(() => {
      result.current.onLayout();
    });

    unmount();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(onVisible).not.toHaveBeenCalled();
  });

  it('starts a trace on first layout and ends it on visibility', () => {
    const onVisible = jest.fn();
    const { result } = renderHook(() => useViewportTracking(onVisible));

    const mockMeasureInWindow = jest.fn(
      (cb: (x: number, y: number, w: number, h: number) => void) => {
        cb(0, 100, 300, 100);
      },
    );
    (result.current.ref as { current: unknown }).current = {
      measureInWindow: mockMeasureInWindow,
    };

    act(() => {
      result.current.onLayout();
    });

    expect(mockTrace).toHaveBeenCalledTimes(1);
    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Market Insights Viewport Tracking',
        op: 'market_insights.viewport_tracking',
      }),
    );

    expect(mockEndTrace).toHaveBeenCalledTimes(1);
    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Market Insights Viewport Tracking',
        data: expect.objectContaining({
          measure_calls: 1,
          resolved_by: 'visibility_threshold',
        }),
      }),
    );
  });

  it('records measure_calls count when resolved via polling', () => {
    const onVisible = jest.fn();
    const { result } = renderHook(() => useViewportTracking(onVisible));

    let y = SCREEN_HEIGHT + 500;
    const mockMeasureInWindow = jest.fn(
      (cb: (x: number, _y: number, w: number, h: number) => void) => {
        cb(0, y, 300, 100);
      },
    );
    (result.current.ref as { current: unknown }).current = {
      measureInWindow: mockMeasureInWindow,
    };

    act(() => {
      result.current.onLayout();
    });

    act(() => {
      jest.advanceTimersByTime(250);
    });

    act(() => {
      jest.advanceTimersByTime(250);
    });

    y = 100;
    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          measure_calls: 4,
          resolved_by: 'visibility_threshold',
        }),
      }),
    );
  });

  it('ends trace with unmount when component is never visible', () => {
    const onVisible = jest.fn();
    const { result, unmount } = renderHook(() =>
      useViewportTracking(onVisible),
    );

    const mockMeasureInWindow = jest.fn(
      (cb: (x: number, y: number, w: number, h: number) => void) => {
        cb(0, SCREEN_HEIGHT + 500, 300, 100);
      },
    );
    (result.current.ref as { current: unknown }).current = {
      measureInWindow: mockMeasureInWindow,
    };

    act(() => {
      result.current.onLayout();
    });

    expect(mockTrace).toHaveBeenCalledTimes(1);

    unmount();

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Market Insights Viewport Tracking',
        data: expect.objectContaining({
          resolved_by: 'unmount',
        }),
      }),
    );
  });
});
