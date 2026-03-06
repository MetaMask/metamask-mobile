import { renderHook, act } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { useViewportTracking } from './useViewportTracking';

jest.useFakeTimers();

const SCREEN_HEIGHT = Dimensions.get('window').height;

describe('useViewportTracking', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('fires callback when component is fully visible on layout', () => {
    const onVisible = jest.fn();
    const { result } = renderHook(() => useViewportTracking(onVisible));

    // height=100, pageY=100 → fully on-screen (100% visible)
    const mockMeasure = jest.fn((cb: (...args: number[]) => void) => {
      cb(0, 0, 300, 100, 0, 100);
    });
    (result.current.ref as { current: unknown }).current = {
      measure: mockMeasure,
    };

    act(() => {
      result.current.onLayout();
    });

    expect(onVisible).toHaveBeenCalledTimes(1);
  });

  it('does not fire callback when component is off screen', () => {
    const onVisible = jest.fn();
    const { result } = renderHook(() => useViewportTracking(onVisible));

    const mockMeasure = jest.fn((cb: (...args: number[]) => void) => {
      cb(0, 0, 300, 100, 0, SCREEN_HEIGHT + 500);
    });
    (result.current.ref as { current: unknown }).current = {
      measure: mockMeasure,
    };

    act(() => {
      result.current.onLayout();
    });

    expect(onVisible).not.toHaveBeenCalled();
  });

  it('does not fire when less than 50% of the component is visible', () => {
    const onVisible = jest.fn();
    const { result } = renderHook(() => useViewportTracking(onVisible));

    // height=100, pageY puts only 40px on screen (40% visible)
    const mockMeasure = jest.fn((cb: (...args: number[]) => void) => {
      cb(0, 0, 300, 100, 0, SCREEN_HEIGHT - 40);
    });
    (result.current.ref as { current: unknown }).current = {
      measure: mockMeasure,
    };

    act(() => {
      result.current.onLayout();
    });

    expect(onVisible).not.toHaveBeenCalled();
  });

  it('fires when at least 50% of the component is visible', () => {
    const onVisible = jest.fn();
    const { result } = renderHook(() => useViewportTracking(onVisible));

    // height=100, pageY puts 60px on screen (60% visible)
    const mockMeasure = jest.fn((cb: (...args: number[]) => void) => {
      cb(0, 0, 300, 100, 0, SCREEN_HEIGHT - 60);
    });
    (result.current.ref as { current: unknown }).current = {
      measure: mockMeasure,
    };

    act(() => {
      result.current.onLayout();
    });

    expect(onVisible).toHaveBeenCalledTimes(1);
  });

  it('fires callback when component scrolls into view via polling', () => {
    const onVisible = jest.fn();
    const { result } = renderHook(() => useViewportTracking(onVisible));

    let pageY = SCREEN_HEIGHT + 500;
    const mockMeasure = jest.fn((cb: (...args: number[]) => void) => {
      cb(0, 0, 300, 100, 0, pageY);
    });
    (result.current.ref as { current: unknown }).current = {
      measure: mockMeasure,
    };

    act(() => {
      result.current.onLayout();
    });
    expect(onVisible).not.toHaveBeenCalled();

    // Simulate scrolling into view (fully visible)
    pageY = 100;
    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(onVisible).toHaveBeenCalledTimes(1);
  });

  it('fires callback only once', () => {
    const onVisible = jest.fn();
    const { result } = renderHook(() => useViewportTracking(onVisible));

    const mockMeasure = jest.fn((cb: (...args: number[]) => void) => {
      cb(0, 0, 300, 100, 0, 100);
    });
    (result.current.ref as { current: unknown }).current = {
      measure: mockMeasure,
    };

    act(() => {
      result.current.onLayout();
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(onVisible).toHaveBeenCalledTimes(1);
  });

  it('cleans up interval on unmount', () => {
    const onVisible = jest.fn();
    const { result, unmount } = renderHook(() =>
      useViewportTracking(onVisible),
    );

    const mockMeasure = jest.fn((cb: (...args: number[]) => void) => {
      cb(0, 0, 300, 100, 0, SCREEN_HEIGHT + 500);
    });
    (result.current.ref as { current: unknown }).current = {
      measure: mockMeasure,
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
});
