// Third party dependencies.
import { renderHook, act } from '@testing-library/react-hooks';
import { Animated } from 'react-native';

// Internal dependencies.
import { useTabsBarLayout } from './useTabsBarLayout';

const makeTabs = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ key: `tab-${i}` }));

const layoutEvent = (x: number, width: number) => ({
  nativeEvent: { layout: { x, y: 0, width, height: 60 } },
});

const containerEvent = (width: number) => ({
  nativeEvent: { layout: { x: 0, y: 0, width, height: 60 } },
});

describe('useTabsBarLayout', () => {
  let scrollViewRef: { current: { scrollTo: jest.Mock } | null };
  let onAnimateToTab: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    scrollViewRef = { current: { scrollTo: jest.fn() } };
    onAnimateToTab = jest.fn().mockReturnValue(null);
  });

  const renderLayout = (
    tabs = makeTabs(2),
    activeIndex = 0,
    overrides: Record<string, unknown> = {},
  ) =>
    renderHook(
      ({ t, ai }: { t: typeof tabs; ai: number }) =>
        useTabsBarLayout({
          tabs: t,
          activeIndex: ai,
          scrollViewRef: scrollViewRef as never,
          onAnimateToTab,
          ...overrides,
        }),
      { initialProps: { t: tabs, ai: activeIndex } },
    );

  describe('initial state', () => {
    it('starts with isInitialized=false and scrollEnabled=false', () => {
      const { result } = renderLayout();
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.scrollEnabled).toBe(false);
    });

    it('exposes handleContainerLayout and handleTabLayout', () => {
      const { result } = renderLayout();
      expect(typeof result.current.handleContainerLayout).toBe('function');
      expect(typeof result.current.handleTabLayout).toBe('function');
    });
  });

  describe('initialization', () => {
    it('calls onAnimateToTab with isFirstTime=true after all layouts are measured', () => {
      const tabs = makeTabs(2);
      const { result } = renderLayout(tabs);
      act(() => {
        result.current.handleContainerLayout(containerEvent(400) as never);
        result.current.handleTabLayout(0, layoutEvent(0, 100) as never);
        result.current.handleTabLayout(1, layoutEvent(120, 100) as never);
      });
      expect(onAnimateToTab).toHaveBeenCalledWith({ x: 0, width: 100 }, true);
      expect(result.current.isInitialized).toBe(true);
    });

    it('does not call onAnimateToTab when a tab layout has zero width', () => {
      const tabs = makeTabs(2);
      const { result } = renderLayout(tabs);
      act(() => {
        result.current.handleContainerLayout(containerEvent(400) as never);
        result.current.handleTabLayout(0, layoutEvent(0, 0) as never);
      });
      expect(onAnimateToTab).not.toHaveBeenCalled();
      expect(result.current.isInitialized).toBe(false);
    });

    it('ignores out-of-range tab layout index', () => {
      const tabs = makeTabs(2);
      const { result } = renderLayout(tabs);
      act(() => {
        result.current.handleTabLayout(99, layoutEvent(0, 100) as never);
      });
      expect(onAnimateToTab).not.toHaveBeenCalled();
    });
  });

  describe('subsequent animation', () => {
    const setupInitialized = (tabs = makeTabs(3)) => {
      const hook = renderLayout(tabs);
      act(() => {
        hook.result.current.handleContainerLayout(containerEvent(400) as never);
        tabs.forEach((_, i) =>
          hook.result.current.handleTabLayout(
            i,
            layoutEvent(i * 120, 100) as never,
          ),
        );
      });
      return hook;
    };

    it('calls onAnimateToTab with isFirstTime=false on activeIndex change', () => {
      const tabs = makeTabs(3);
      const hook = renderLayout(tabs, 0);
      act(() => {
        hook.result.current.handleContainerLayout(containerEvent(400) as never);
        tabs.forEach((_, i) =>
          hook.result.current.handleTabLayout(
            i,
            layoutEvent(i * 120, 100) as never,
          ),
        );
      });
      onAnimateToTab.mockClear();
      const animation = {
        start: jest.fn((cb) => cb({ finished: true })),
        stop: jest.fn(),
      };
      onAnimateToTab.mockReturnValue(animation);
      hook.rerender({ t: tabs, ai: 2 });
      expect(onAnimateToTab).toHaveBeenCalledWith(
        { x: 240, width: 100 },
        false,
      );
    });

    it('starts the returned animation on subsequent tab switch', () => {
      const tabs = makeTabs(2);
      const mockAnimation = {
        start: jest.fn((cb) => cb({ finished: true })),
        stop: jest.fn(),
      };
      onAnimateToTab.mockReturnValue(mockAnimation);
      const hook = renderLayout(tabs, 0);
      act(() => {
        hook.result.current.handleContainerLayout(containerEvent(400) as never);
        tabs.forEach((_, i) =>
          hook.result.current.handleTabLayout(
            i,
            layoutEvent(i * 120, 100) as never,
          ),
        );
      });
      // First call is isFirstTime=true — animation is null; now switch tab
      onAnimateToTab.mockClear();
      hook.rerender({ t: tabs, ai: 1 });
      expect(mockAnimation.start).toHaveBeenCalled();
    });

    it('re-animates when a significant layout change occurs after initialization', () => {
      jest.useFakeTimers();
      try {
        const hook = setupInitialized();
        onAnimateToTab.mockClear();
        act(() => {
          // Trigger a significant change (> 1px) — schedules a RAF
          hook.result.current.handleTabLayout(0, layoutEvent(0, 130) as never);
          jest.runAllTimers();
        });
        expect(onAnimateToTab).toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });

    it('does not re-animate for insignificant layout changes', () => {
      const hook = setupInitialized();
      onAnimateToTab.mockClear();
      act(() => {
        // Less than 1px change — should be ignored
        hook.result.current.handleTabLayout(0, layoutEvent(0, 100.5) as never);
      });
      expect(onAnimateToTab).not.toHaveBeenCalled();
    });
  });

  describe('scroll mode', () => {
    it('enables scroll when total tab width exceeds container width', () => {
      const tabs = makeTabs(3);
      const { result } = renderLayout(tabs);
      act(() => {
        // Container: 200px; tabs: 3 × 150px + 2 × 24px gaps = 498px > 200-32=168
        result.current.handleContainerLayout(containerEvent(200) as never);
        tabs.forEach((_, i) =>
          result.current.handleTabLayout(i, layoutEvent(i * 160, 150) as never),
        );
      });
      expect(result.current.scrollEnabled).toBe(true);
    });

    it('does not enable scroll when fillWidth is true', () => {
      const tabs = makeTabs(3);
      const { result } = renderHook(() =>
        useTabsBarLayout({
          tabs,
          activeIndex: 0,
          fillWidth: true,
          scrollViewRef: scrollViewRef as never,
          onAnimateToTab,
        }),
      );
      act(() => {
        result.current.handleContainerLayout(containerEvent(50) as never);
        tabs.forEach((_, i) =>
          result.current.handleTabLayout(i, layoutEvent(i * 100, 90) as never),
        );
      });
      expect(result.current.scrollEnabled).toBe(false);
    });

    it('calls scrollTo during initialization in scroll mode', () => {
      const tabs = makeTabs(3);
      const hook = renderLayout(tabs, 0);
      // Round 1: all layouts measured → scroll mode activates, which synchronously
      // clears tabLayouts via the prevScrollEnabled effect (real-world behavior:
      // the component re-renders in scroll mode and re-fires onLayout callbacks).
      act(() => {
        hook.result.current.handleContainerLayout(containerEvent(200) as never);
        tabs.forEach((_, i) =>
          hook.result.current.handleTabLayout(
            i,
            layoutEvent(i * 160, 150) as never,
          ),
        );
      });
      // Round 2: re-measure in scroll mode → initialization runs with scrollEnabled=true
      act(() => {
        tabs.forEach((_, i) =>
          hook.result.current.handleTabLayout(
            i,
            layoutEvent(i * 160, 150) as never,
          ),
        );
      });
      expect(scrollViewRef.current?.scrollTo).toHaveBeenCalled();
    });
  });

  describe('tabs array changes', () => {
    it('resets initialized state when tab count changes', () => {
      const initialTabs = makeTabs(2);
      const hook = renderLayout(initialTabs, 0);
      act(() => {
        hook.result.current.handleContainerLayout(containerEvent(400) as never);
        initialTabs.forEach((_, i) =>
          hook.result.current.handleTabLayout(
            i,
            layoutEvent(i * 120, 100) as never,
          ),
        );
      });
      expect(hook.result.current.isInitialized).toBe(true);

      const newTabs = makeTabs(3);
      hook.rerender({ t: newTabs, ai: 0 });
      expect(hook.result.current.isInitialized).toBe(false);
    });

    it('resets initialized state when tab keys change', () => {
      const initialTabs = makeTabs(2);
      const hook = renderLayout(initialTabs, 0);
      act(() => {
        hook.result.current.handleContainerLayout(containerEvent(400) as never);
        initialTabs.forEach((_, i) =>
          hook.result.current.handleTabLayout(
            i,
            layoutEvent(i * 120, 100) as never,
          ),
        );
      });
      const renamedTabs = initialTabs.map((t, i) => ({ key: `renamed-${i}` }));
      hook.rerender({ t: renamedTabs, ai: 0 });
      expect(hook.result.current.isInitialized).toBe(false);
    });
  });

  describe('activeIndex=-1', () => {
    it('does not call onAnimateToTab when activeIndex is -1', () => {
      const tabs = makeTabs(2);
      const { result } = renderHook(() =>
        useTabsBarLayout({
          tabs,
          activeIndex: -1,
          scrollViewRef: scrollViewRef as never,
          onAnimateToTab,
        }),
      );
      act(() => {
        result.current.handleContainerLayout(containerEvent(400) as never);
        tabs.forEach((_, i) =>
          result.current.handleTabLayout(i, layoutEvent(i * 120, 100) as never),
        );
      });
      expect(onAnimateToTab).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('stops animation on unmount without throwing', () => {
      const mockAnimation = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      onAnimateToTab.mockReturnValue(mockAnimation);
      const tabs = makeTabs(2);
      const hook = renderLayout(tabs, 0);
      act(() => {
        hook.result.current.handleContainerLayout(containerEvent(400) as never);
        tabs.forEach((_, i) =>
          hook.result.current.handleTabLayout(
            i,
            layoutEvent(i * 120, 100) as never,
          ),
        );
      });
      expect(() => hook.unmount()).not.toThrow();
    });
  });

  describe('Animated.Value integration', () => {
    it('passes correct layout to onAnimateToTab for the active tab', () => {
      const tabs = makeTabs(3);
      const hook = renderLayout(tabs, 1);
      act(() => {
        hook.result.current.handleContainerLayout(containerEvent(400) as never);
        tabs.forEach((_, i) =>
          hook.result.current.handleTabLayout(
            i,
            layoutEvent(i * 120, 100) as never,
          ),
        );
      });
      expect(onAnimateToTab).toHaveBeenCalledWith({ x: 120, width: 100 }, true);
    });
  });
});
