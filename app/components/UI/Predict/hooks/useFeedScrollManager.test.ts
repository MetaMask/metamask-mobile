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

  const createDefaultProps = (overrides = {}) => {
    const mockSetActiveIndex = jest.fn();
    return {
      headerRef: createMockRef(120) as React.RefObject<never>,
      tabBarRef: createMockRef(48) as React.RefObject<never>,
      setActiveIndex: mockSetActiveIndex,
      ...overrides,
    };
  };

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
      const props = createDefaultProps();

      const { result } = renderHook(() => useFeedScrollManager(props));

      expect(result.current.headerTranslateY).toBeDefined();
      expect(result.current.headerTranslateY.value).toBe(0);
      expect(result.current.headerHidden).toBe(false);
    });

    it('provides all required properties', () => {
      const props = createDefaultProps();

      const { result } = renderHook(() => useFeedScrollManager(props));

      expect(result.current.headerTranslateY).toBeDefined();
      expect(typeof result.current.headerHidden).toBe('boolean');
      expect(typeof result.current.headerHeight).toBe('number');
      expect(typeof result.current.tabBarHeight).toBe('number');
      expect(typeof result.current.layoutReady).toBe('boolean');
      expect(typeof result.current.onTabSwitch).toBe('function');
      expect(result.current.scrollHandler).toBeDefined();
    });

    it('initializes layoutReady as false before measurements', () => {
      const props = createDefaultProps({
        headerRef: createMockRef() as React.RefObject<never>,
        tabBarRef: createMockRef() as React.RefObject<never>,
      });

      const { result } = renderHook(() => useFeedScrollManager(props));

      expect(result.current.layoutReady).toBe(false);
    });

    it('initializes heights as 0 before measurement', () => {
      const props = createDefaultProps({
        headerRef: createMockRef() as React.RefObject<never>,
        tabBarRef: createMockRef() as React.RefObject<never>,
      });

      const { result } = renderHook(() => useFeedScrollManager(props));

      expect(result.current.headerHeight).toBe(0);
      expect(result.current.tabBarHeight).toBe(0);
    });
  });

  describe('onTabSwitch', () => {
    it('calls setActiveIndex when onTabSwitch is called', () => {
      const props = createDefaultProps();

      const { result } = renderHook(() => useFeedScrollManager(props));

      act(() => {
        result.current.onTabSwitch(2);
      });

      expect(props.setActiveIndex).toHaveBeenCalledWith(2);
    });

    it('calls setActiveIndex with different values sequentially', () => {
      const props = createDefaultProps();

      const { result } = renderHook(() => useFeedScrollManager(props));

      act(() => {
        result.current.onTabSwitch(1);
      });
      expect(props.setActiveIndex).toHaveBeenCalledWith(1);

      act(() => {
        result.current.onTabSwitch(4);
      });
      expect(props.setActiveIndex).toHaveBeenCalledWith(4);

      act(() => {
        result.current.onTabSwitch(0);
      });
      expect(props.setActiveIndex).toHaveBeenCalledWith(0);
    });

    it('handles rapid tab switches', () => {
      const props = createDefaultProps();

      const { result } = renderHook(() => useFeedScrollManager(props));

      act(() => {
        result.current.onTabSwitch(1);
        result.current.onTabSwitch(2);
        result.current.onTabSwitch(3);
        result.current.onTabSwitch(4);
      });

      expect(props.setActiveIndex).toHaveBeenCalledTimes(4);
      expect(props.setActiveIndex).toHaveBeenLastCalledWith(4);
    });
  });

  describe('layout measurement', () => {
    it('measures header height after mount', async () => {
      const props = createDefaultProps();

      const { result } = renderHook(() => useFeedScrollManager(props));

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.headerHeight).toBe(120);
      });
    });

    it('measures tabBar height after mount', async () => {
      const props = createDefaultProps();

      const { result } = renderHook(() => useFeedScrollManager(props));

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.tabBarHeight).toBe(48);
      });
    });

    it('sets layoutReady to true after both measurements complete', async () => {
      const props = createDefaultProps();

      const { result } = renderHook(() => useFeedScrollManager(props));

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.layoutReady).toBe(true);
      });
    });
  });

  describe('null refs handling', () => {
    it('handles null headerRef gracefully', () => {
      const props = createDefaultProps({
        headerRef: { current: null } as React.RefObject<never>,
      });

      const { result } = renderHook(() => useFeedScrollManager(props));

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.headerHeight).toBe(0);
    });

    it('handles null tabBarRef gracefully', () => {
      const props = createDefaultProps({
        tabBarRef: { current: null } as React.RefObject<never>,
      });

      const { result } = renderHook(() => useFeedScrollManager(props));

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.tabBarHeight).toBe(0);
    });

    it('handles both refs being null', () => {
      const props = createDefaultProps({
        headerRef: { current: null } as React.RefObject<never>,
        tabBarRef: { current: null } as React.RefObject<never>,
      });

      const { result } = renderHook(() => useFeedScrollManager(props));

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.headerHeight).toBe(0);
      expect(result.current.tabBarHeight).toBe(0);
      expect(result.current.layoutReady).toBe(false);
    });

    it('keeps layoutReady false with zero height measurements', () => {
      const props = createDefaultProps({
        headerRef: createMockRef(0) as React.RefObject<never>,
        tabBarRef: createMockRef(0) as React.RefObject<never>,
      });

      const { result } = renderHook(() => useFeedScrollManager(props));

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.layoutReady).toBe(false);
    });
  });

  describe('hook stability', () => {
    it('returns a callable onTabSwitch function after re-render', () => {
      const props = createDefaultProps();

      const { result, rerender } = renderHook(
        (p: typeof props) => useFeedScrollManager(p),
        { initialProps: props },
      );

      rerender(props);

      act(() => {
        result.current.onTabSwitch(2);
      });

      expect(props.setActiveIndex).toHaveBeenCalledWith(2);
    });

    it('provides consistent API across multiple renders', () => {
      const props = createDefaultProps();

      const { result, rerender } = renderHook(
        (p: typeof props) => useFeedScrollManager(p),
        { initialProps: props },
      );

      expect(typeof result.current.onTabSwitch).toBe('function');

      rerender(props);

      expect(typeof result.current.onTabSwitch).toBe('function');
    });
  });

  describe('cleanup', () => {
    it('clears timeout on unmount without errors', () => {
      const props = createDefaultProps();

      const { unmount } = renderHook(() => useFeedScrollManager(props));

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
      const props = createDefaultProps();

      const { result } = renderHook(() => useFeedScrollManager(props));

      expect(result.current.scrollHandler).toBeDefined();
    });

    it('processes scroll event without throwing', () => {
      const props = createDefaultProps();

      const { result } = renderHook(() => useFeedScrollManager(props));

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      expect(() => {
        handler.onScroll?.({ contentOffset: { y: 0 } });
      }).not.toThrow();
    });

    it('handles scroll down events', () => {
      const props = createDefaultProps();

      const { result } = renderHook(() => useFeedScrollManager(props));

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      handler.onScroll?.({ contentOffset: { y: 0 } });
      handler.onScroll?.({ contentOffset: { y: 100 } });
      handler.onScroll?.({ contentOffset: { y: 200 } });
      handler.onScroll?.({ contentOffset: { y: 300 } });

      expect(result.current.scrollHandler).toBeDefined();
    });

    it('handles tab switching by skipping first scroll event', () => {
      const props = createDefaultProps();

      const { result } = renderHook(() => useFeedScrollManager(props));

      act(() => {
        result.current.onTabSwitch(1);
      });

      const handler = result.current.scrollHandler as unknown as ScrollHandler;
      handler.onScroll?.({ contentOffset: { y: 100 } });

      expect(props.setActiveIndex).toHaveBeenCalledWith(1);
    });

    it('handles zero delta scroll events', () => {
      const props = createDefaultProps();

      const { result } = renderHook(() => useFeedScrollManager(props));

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      handler.onScroll?.({ contentOffset: { y: 100 } });
      handler.onScroll?.({ contentOffset: { y: 100 } });

      expect(result.current.scrollHandler).toBeDefined();
    });

    it('does not trigger header change when below threshold', async () => {
      const props = createDefaultProps();

      const { result } = renderHook(() => useFeedScrollManager(props));

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
  });

  describe('onLayout callbacks', () => {
    it('provides onHeaderLayout callback', () => {
      const props = createDefaultProps();

      const { result } = renderHook(() => useFeedScrollManager(props));

      expect(typeof result.current.onHeaderLayout).toBe('function');
    });

    it('provides onTabBarLayout callback', () => {
      const props = createDefaultProps();

      const { result } = renderHook(() => useFeedScrollManager(props));

      expect(typeof result.current.onTabBarLayout).toBe('function');
    });

    it('updates headerHeight when onHeaderLayout called with value > 0', () => {
      const props = createDefaultProps({
        headerRef: { current: null } as React.RefObject<never>,
        tabBarRef: { current: null } as React.RefObject<never>,
      });

      const { result } = renderHook(() => useFeedScrollManager(props));

      expect(result.current.headerHeight).toBe(0);

      act(() => {
        result.current.onHeaderLayout({
          nativeEvent: { layout: { height: 150, width: 375, x: 0, y: 0 } },
        } as never);
      });

      expect(result.current.headerHeight).toBe(150);
    });

    it('updates tabBarHeight when onTabBarLayout called with value > 0', () => {
      const props = createDefaultProps({
        headerRef: { current: null } as React.RefObject<never>,
        tabBarRef: { current: null } as React.RefObject<never>,
      });

      const { result } = renderHook(() => useFeedScrollManager(props));

      expect(result.current.tabBarHeight).toBe(0);

      act(() => {
        result.current.onTabBarLayout({
          nativeEvent: { layout: { height: 56, width: 375, x: 0, y: 0 } },
        } as never);
      });

      expect(result.current.tabBarHeight).toBe(56);
    });
  });
});
