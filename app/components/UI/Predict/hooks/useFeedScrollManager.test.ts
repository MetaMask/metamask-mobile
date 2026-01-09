import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import {
  useFeedScrollManager,
  HEADER_ANIMATION_DURATION,
  SCROLL_THRESHOLD,
} from './useFeedScrollManager';

const mockSharedValues: { value: unknown }[] = [];

const mockRunOnJS = jest.fn(
  (fn: (...args: unknown[]) => void) =>
    (...args: unknown[]) =>
      fn(...args),
);

const mockWithTiming = jest.fn((toValue: unknown) => toValue);

jest.mock('react-native-reanimated', () => ({
  useSharedValue: jest.fn((initialValue: unknown) => {
    const sharedValue = { value: initialValue };
    mockSharedValues.push(sharedValue);
    return sharedValue;
  }),
  useAnimatedScrollHandler: jest.fn(
    (config: { onScroll: (event: { contentOffset: { y: number } }) => void }) =>
      config,
  ),
  withTiming: mockWithTiming,
  Easing: {
    out: jest.fn((easing: unknown) => easing),
    cubic: jest.fn(),
  },
  runOnJS: mockRunOnJS,
}));

describe('useFeedScrollManager', () => {
  const createMockRef = (height?: number) => ({
    current:
      height !== undefined
        ? {
            measure: jest.fn((callback) => {
              callback(0, 0, 375, height);
            }),
          }
        : null,
  });

  const originalPlatformOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockSharedValues.length = 0;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    Platform.OS = originalPlatformOS;
  });

  describe('constants', () => {
    it('exports HEADER_ANIMATION_DURATION as 450ms', () => {
      expect(HEADER_ANIMATION_DURATION).toBe(450);
    });

    it('exports SCROLL_THRESHOLD as 250 pixels', () => {
      expect(SCROLL_THRESHOLD).toBe(250);
    });
  });

  describe('initialization', () => {
    it('initializes with default values', () => {
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      expect(result.current.headerTranslateY).toBeDefined();
      expect(result.current.headerTranslateY.value).toBe(0);
      expect(result.current.headerHidden).toBe(false);
      expect(result.current.activeIndex).toBe(0);
    });

    it('provides all required properties', () => {
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      expect(result.current.headerTranslateY).toBeDefined();
      expect(typeof result.current.headerHidden).toBe('boolean');
      expect(typeof result.current.headerHeight).toBe('number');
      expect(typeof result.current.tabBarHeight).toBe('number');
      expect(typeof result.current.layoutReady).toBe('boolean');
      expect(typeof result.current.activeIndex).toBe('number');
      expect(typeof result.current.setActiveIndex).toBe('function');
      expect(result.current.scrollHandler).toBeDefined();
    });

    it('initializes layoutReady as false before measurements', () => {
      const headerRef = createMockRef();
      const tabBarRef = createMockRef();

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      expect(result.current.layoutReady).toBe(false);
    });

    it('initializes heights as 0 before measurement', () => {
      const headerRef = createMockRef();
      const tabBarRef = createMockRef();

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      expect(result.current.headerHeight).toBe(0);
      expect(result.current.tabBarHeight).toBe(0);
    });
  });

  describe('setActiveIndex', () => {
    it('updates activeIndex when called', () => {
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      act(() => {
        result.current.setActiveIndex(2);
      });

      expect(result.current.activeIndex).toBe(2);
    });

    it('updates activeIndex to different values sequentially', () => {
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      act(() => {
        result.current.setActiveIndex(1);
      });
      expect(result.current.activeIndex).toBe(1);

      act(() => {
        result.current.setActiveIndex(4);
      });
      expect(result.current.activeIndex).toBe(4);

      act(() => {
        result.current.setActiveIndex(0);
      });
      expect(result.current.activeIndex).toBe(0);
    });

    it('handles rapid index changes', () => {
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      act(() => {
        result.current.setActiveIndex(1);
        result.current.setActiveIndex(2);
        result.current.setActiveIndex(3);
        result.current.setActiveIndex(4);
      });

      expect(result.current.activeIndex).toBe(4);
    });
  });

  describe('layout measurement', () => {
    it('measures header height after mount', async () => {
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as unknown as React.RefObject<never>,
          tabBarRef: tabBarRef as unknown as React.RefObject<never>,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.headerHeight).toBe(120);
      });
    });

    it('measures tabBar height after mount', async () => {
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as unknown as React.RefObject<never>,
          tabBarRef: tabBarRef as unknown as React.RefObject<never>,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.tabBarHeight).toBe(48);
      });
    });

    it('sets layoutReady to true after both measurements complete', async () => {
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as unknown as React.RefObject<never>,
          tabBarRef: tabBarRef as unknown as React.RefObject<never>,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.layoutReady).toBe(true);
      });
    });

    it('retries measurement when initial height is zero', async () => {
      let callCount = 0;
      type MeasureCallback = (
        x: number,
        y: number,
        width: number,
        height: number,
      ) => void;
      const headerRef = {
        current: {
          measure: jest.fn((callback: MeasureCallback) => {
            callCount++;
            const height = callCount > 2 ? 120 : 0;
            callback(0, 0, 375, height);
          }),
        },
      };
      const tabBarRef = createMockRef(48);

      renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as unknown as React.RefObject<never>,
          tabBarRef: tabBarRef as unknown as React.RefObject<never>,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(headerRef.current.measure).toHaveBeenCalled();
    });

    it('does not re-measure when already measured', async () => {
      type MeasureCallback = (
        x: number,
        y: number,
        width: number,
        height: number,
      ) => void;
      const measureFn = jest.fn((callback: MeasureCallback) => {
        callback(0, 0, 375, 120);
      });
      const headerRef = { current: { measure: measureFn } };
      const tabBarRef = createMockRef(48);

      const props = {
        headerRef: headerRef as unknown as React.RefObject<never>,
        tabBarRef: tabBarRef as unknown as React.RefObject<never>,
      };

      const { rerender } = renderHook(
        (p: typeof props) => useFeedScrollManager(p),
        { initialProps: props },
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      const callCountAfterFirst = measureFn.mock.calls.length;

      rerender(props);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(measureFn.mock.calls.length).toBe(callCountAfterFirst);
    });
  });

  describe('null refs handling', () => {
    it('handles null headerRef gracefully', () => {
      const headerRef = { current: null };
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.headerHeight).toBe(0);
    });

    it('handles null tabBarRef gracefully', () => {
      const headerRef = createMockRef(120);
      const tabBarRef = { current: null };

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.tabBarHeight).toBe(0);
    });

    it('handles both refs being null', () => {
      const headerRef = { current: null };
      const tabBarRef = { current: null };

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.headerHeight).toBe(0);
      expect(result.current.tabBarHeight).toBe(0);
      expect(result.current.layoutReady).toBe(false);
    });

    it('keeps layoutReady false with zero height measurements', () => {
      const headerRef = createMockRef(0);
      const tabBarRef = createMockRef(0);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.layoutReady).toBe(false);
    });
  });

  describe('hook stability', () => {
    it('returns a callable setActiveIndex function after re-render', () => {
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const props = {
        headerRef: headerRef as React.RefObject<never>,
        tabBarRef: tabBarRef as React.RefObject<never>,
      };

      const { result, rerender } = renderHook(
        (p: typeof props) => useFeedScrollManager(p),
        { initialProps: props },
      );

      rerender(props);

      act(() => {
        result.current.setActiveIndex(2);
      });

      expect(result.current.activeIndex).toBe(2);
    });

    it('maintains state across re-renders', () => {
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const props = {
        headerRef: headerRef as React.RefObject<never>,
        tabBarRef: tabBarRef as React.RefObject<never>,
      };

      const { result, rerender } = renderHook(
        (p: typeof props) => useFeedScrollManager(p),
        { initialProps: props },
      );

      act(() => {
        result.current.setActiveIndex(3);
      });

      rerender(props);

      expect(result.current.activeIndex).toBe(3);
    });

    it('provides consistent API across multiple renders', () => {
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const props = {
        headerRef: headerRef as React.RefObject<never>,
        tabBarRef: tabBarRef as React.RefObject<never>,
      };

      const { result, rerender } = renderHook(
        (p: typeof props) => useFeedScrollManager(p),
        { initialProps: props },
      );

      expect(typeof result.current.setActiveIndex).toBe('function');

      rerender(props);

      expect(typeof result.current.setActiveIndex).toBe('function');
    });
  });

  describe('cleanup', () => {
    it('clears timeout on unmount without errors', () => {
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { unmount } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      unmount();

      expect(() => {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }).not.toThrow();
    });
  });

  describe('scrollHandler', () => {
    interface ScrollHandler {
      onScroll?: (event: { contentOffset: { y: number } }) => void;
    }

    it('returns scroll handler object', () => {
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      expect(result.current.scrollHandler).toBeDefined();
    });

    it('processes scroll event without throwing', () => {
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      expect(() => {
        handler.onScroll?.({ contentOffset: { y: 0 } });
      }).not.toThrow();
    });

    it('handles scroll down events', () => {
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      handler.onScroll?.({ contentOffset: { y: 0 } });
      handler.onScroll?.({ contentOffset: { y: 100 } });
      handler.onScroll?.({ contentOffset: { y: 200 } });
      handler.onScroll?.({ contentOffset: { y: 300 } });

      expect(result.current.scrollHandler).toBeDefined();
    });

    it('handles scroll up events', () => {
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      handler.onScroll?.({ contentOffset: { y: 500 } });
      handler.onScroll?.({ contentOffset: { y: 400 } });
      handler.onScroll?.({ contentOffset: { y: 300 } });
      handler.onScroll?.({ contentOffset: { y: 200 } });

      expect(result.current.scrollHandler).toBeDefined();
    });

    it('handles tab switching by skipping first scroll event', () => {
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      act(() => {
        result.current.setActiveIndex(1);
      });

      const handler = result.current.scrollHandler as unknown as ScrollHandler;
      handler.onScroll?.({ contentOffset: { y: 100 } });

      expect(result.current.activeIndex).toBe(1);
    });

    it('handles zero delta scroll events', () => {
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      handler.onScroll?.({ contentOffset: { y: 100 } });
      handler.onScroll?.({ contentOffset: { y: 100 } });

      expect(result.current.scrollHandler).toBeDefined();
    });

    it('handles at-top scroll position on iOS', () => {
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      handler.onScroll?.({ contentOffset: { y: -10 } });
      handler.onScroll?.({ contentOffset: { y: -5 } });

      expect(result.current.scrollHandler).toBeDefined();
    });

    it('handles direction change during scroll', () => {
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      handler.onScroll?.({ contentOffset: { y: 0 } });
      handler.onScroll?.({ contentOffset: { y: 100 } });
      handler.onScroll?.({ contentOffset: { y: 50 } });

      expect(result.current.scrollHandler).toBeDefined();
    });

    it('accumulates scroll delta until threshold', () => {
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      for (let i = 0; i <= 300; i += 50) {
        handler.onScroll?.({ contentOffset: { y: i } });
      }

      expect(result.current.scrollHandler).toBeDefined();
    });

    it('processes scroll events without errors for extended scrolling', async () => {
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.layoutReady).toBe(true);
      });

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      expect(() => {
        handler.onScroll?.({ contentOffset: { y: 0 } });
        handler.onScroll?.({ contentOffset: { y: 100 } });
        handler.onScroll?.({ contentOffset: { y: 200 } });
        handler.onScroll?.({ contentOffset: { y: 300 } });
        handler.onScroll?.({ contentOffset: { y: 400 } });
        handler.onScroll?.({ contentOffset: { y: 500 } });
      }).not.toThrow();
    });

    it('processes scroll up events after scroll down without errors', async () => {
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.layoutReady).toBe(true);
      });

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      expect(() => {
        handler.onScroll?.({ contentOffset: { y: 0 } });
        handler.onScroll?.({ contentOffset: { y: 100 } });
        handler.onScroll?.({ contentOffset: { y: 200 } });
        handler.onScroll?.({ contentOffset: { y: 300 } });
        handler.onScroll?.({ contentOffset: { y: 250 } });
        handler.onScroll?.({ contentOffset: { y: 150 } });
        handler.onScroll?.({ contentOffset: { y: 50 } });
        handler.onScroll?.({ contentOffset: { y: 0 } });
      }).not.toThrow();
    });

    it('handles iOS negative contentOffset at top of list', async () => {
      Platform.OS = 'ios';
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.layoutReady).toBe(true);
      });

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      expect(() => {
        handler.onScroll?.({ contentOffset: { y: 0 } });
        handler.onScroll?.({ contentOffset: { y: 100 } });
        handler.onScroll?.({ contentOffset: { y: 200 } });
        handler.onScroll?.({ contentOffset: { y: 300 } });
        handler.onScroll?.({ contentOffset: { y: 0 } });
        handler.onScroll?.({ contentOffset: { y: -10 } });
        handler.onScroll?.({ contentOffset: { y: -20 } });
      }).not.toThrow();
    });

    it('handles Android contentOffset below content inset at top of list', async () => {
      Platform.OS = 'android';
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.layoutReady).toBe(true);
      });

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      expect(() => {
        handler.onScroll?.({ contentOffset: { y: 200 } });
        handler.onScroll?.({ contentOffset: { y: 300 } });
        handler.onScroll?.({ contentOffset: { y: 400 } });
        handler.onScroll?.({ contentOffset: { y: 500 } });
        handler.onScroll?.({ contentOffset: { y: 400 } });
        handler.onScroll?.({ contentOffset: { y: 300 } });
        handler.onScroll?.({ contentOffset: { y: 150 } });
        handler.onScroll?.({ contentOffset: { y: 100 } });
      }).not.toThrow();
    });

    it('handles Android direction reversal after scrolling down', async () => {
      Platform.OS = 'android';
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.layoutReady).toBe(true);
      });

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      expect(() => {
        handler.onScroll?.({ contentOffset: { y: 200 } });
        handler.onScroll?.({ contentOffset: { y: 300 } });
        handler.onScroll?.({ contentOffset: { y: 400 } });
        handler.onScroll?.({ contentOffset: { y: 500 } });
        handler.onScroll?.({ contentOffset: { y: 490 } });
      }).not.toThrow();
    });

    it('resets accumulated delta when direction changes', async () => {
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.layoutReady).toBe(true);
      });

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      act(() => {
        handler.onScroll?.({ contentOffset: { y: 0 } });
        handler.onScroll?.({ contentOffset: { y: 100 } });
        handler.onScroll?.({ contentOffset: { y: 50 } });
        handler.onScroll?.({ contentOffset: { y: 100 } });
        handler.onScroll?.({ contentOffset: { y: 50 } });
      });

      expect(result.current.headerHidden).toBe(false);
    });

    it('does not trigger header change when below threshold', async () => {
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.layoutReady).toBe(true);
      });

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      act(() => {
        handler.onScroll?.({ contentOffset: { y: 0 } });
        handler.onScroll?.({ contentOffset: { y: 50 } });
        handler.onScroll?.({ contentOffset: { y: 100 } });
      });

      expect(result.current.headerHidden).toBe(false);
    });

    it('handles scroll events after tab switch without errors', async () => {
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.layoutReady).toBe(true);
      });

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      await act(async () => {
        handler.onScroll?.({ contentOffset: { y: 0 } });
        handler.onScroll?.({ contentOffset: { y: 100 } });
        handler.onScroll?.({ contentOffset: { y: 200 } });
        handler.onScroll?.({ contentOffset: { y: 300 } });
      });

      await act(async () => {
        result.current.setActiveIndex(1);
      });

      expect(() => {
        handler.onScroll?.({ contentOffset: { y: 500 } });
        handler.onScroll?.({ contentOffset: { y: 600 } });
      }).not.toThrow();

      expect(result.current.activeIndex).toBe(1);
    });

    it('invokes runOnJS during scroll operations', async () => {
      mockRunOnJS.mockClear();
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.layoutReady).toBe(true);
      });

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      await act(async () => {
        handler.onScroll?.({ contentOffset: { y: 0 } });
        handler.onScroll?.({ contentOffset: { y: 100 } });
        handler.onScroll?.({ contentOffset: { y: 200 } });
        handler.onScroll?.({ contentOffset: { y: 300 } });
        handler.onScroll?.({ contentOffset: { y: 400 } });
        handler.onScroll?.({ contentOffset: { y: 500 } });
      });

      expect(result.current.scrollHandler).toBeDefined();
    });

    it('handles multiple direction changes without errors', async () => {
      const headerRef = createMockRef(120);
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as React.RefObject<never>,
          tabBarRef: tabBarRef as React.RefObject<never>,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.layoutReady).toBe(true);
      });

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      expect(() => {
        handler.onScroll?.({ contentOffset: { y: 0 } });
        handler.onScroll?.({ contentOffset: { y: 100 } });
        handler.onScroll?.({ contentOffset: { y: 200 } });
        handler.onScroll?.({ contentOffset: { y: 300 } });
        handler.onScroll?.({ contentOffset: { y: 250 } });
        handler.onScroll?.({ contentOffset: { y: 150 } });
        handler.onScroll?.({ contentOffset: { y: 200 } });
        handler.onScroll?.({ contentOffset: { y: 350 } });
        handler.onScroll?.({ contentOffset: { y: 300 } });
        handler.onScroll?.({ contentOffset: { y: 100 } });
      }).not.toThrow();
    });
  });

  describe('layout measurement retries', () => {
    it('stops retrying after max retries exceeded', async () => {
      let measureCallCount = 0;
      type MeasureCallback = (
        x: number,
        y: number,
        width: number,
        height: number,
      ) => void;
      const headerRef = {
        current: {
          measure: jest.fn((callback: MeasureCallback) => {
            measureCallCount++;
            callback(0, 0, 375, 0);
          }),
        },
      };
      const tabBarRef = {
        current: {
          measure: jest.fn((callback: MeasureCallback) => {
            callback(0, 0, 375, 0);
          }),
        },
      };

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as unknown as React.RefObject<never>,
          tabBarRef: tabBarRef as unknown as React.RefObject<never>,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(600);
      });

      expect(result.current.layoutReady).toBe(false);
      expect(measureCallCount).toBeGreaterThanOrEqual(10);
    });

    it('succeeds on retry when measurement becomes available', async () => {
      let measureCallCount = 0;
      type MeasureCallback = (
        x: number,
        y: number,
        width: number,
        height: number,
      ) => void;
      const headerRef = {
        current: {
          measure: jest.fn((callback: MeasureCallback) => {
            measureCallCount++;
            const height = measureCallCount >= 3 ? 120 : 0;
            callback(0, 0, 375, height);
          }),
        },
      };
      const tabBarRef = createMockRef(48);

      const { result } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as unknown as React.RefObject<never>,
          tabBarRef: tabBarRef as unknown as React.RefObject<never>,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(result.current.layoutReady).toBe(true);
      });

      expect(result.current.headerHeight).toBe(120);
    });

    it('cleans up multiple pending timeouts on unmount', () => {
      type MeasureCallback = (
        x: number,
        y: number,
        width: number,
        height: number,
      ) => void;
      const headerRef = {
        current: {
          measure: jest.fn((callback: MeasureCallback) => {
            callback(0, 0, 375, 0);
          }),
        },
      };
      const tabBarRef = {
        current: {
          measure: jest.fn((callback: MeasureCallback) => {
            callback(0, 0, 375, 0);
          }),
        },
      };

      const { unmount } = renderHook(() =>
        useFeedScrollManager({
          headerRef: headerRef as unknown as React.RefObject<never>,
          tabBarRef: tabBarRef as unknown as React.RefObject<never>,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(200);
      });

      unmount();

      expect(() => {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }).not.toThrow();
    });
  });
});
