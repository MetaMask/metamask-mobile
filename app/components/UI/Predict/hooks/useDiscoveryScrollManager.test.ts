import { renderHook, act } from '@testing-library/react-native';
import { SharedValue } from 'react-native-reanimated';
import {
  useDiscoveryScrollManager,
  ANIMATION_DURATION,
  SCROLL_THRESHOLD,
} from './useDiscoveryScrollManager';

const mockWithTiming = jest.fn((toValue: unknown) => toValue);
const mockWithDelay = jest.fn(
  (_delay: unknown, animation: unknown) => animation,
);
const mockRunOnJS = jest.fn(
  (fn: (...args: unknown[]) => void) =>
    (...args: unknown[]) =>
      fn(...args),
);

jest.mock('react-native-reanimated', () => {
  const { useRef } = jest.requireActual('react');
  return {
    // useRef keeps the SharedValue object alive across re-renders, matching
    // the real implementation and preventing isHeaderHidden from resetting to
    // its initial value whenever a state update triggers a re-render.
    useSharedValue: jest.fn((initialValue: unknown) => {
      const ref = useRef({ value: initialValue });
      return ref.current;
    }),
    useAnimatedScrollHandler: jest.fn(
      (config: { onScroll: (event: ScrollEvent) => void }) => config,
    ),
    withTiming: mockWithTiming,
    withDelay: mockWithDelay,
    Easing: {
      out: jest.fn((easing: unknown) => easing),
      cubic: jest.fn(),
    },
    runOnJS: mockRunOnJS,
  };
});

interface ScrollEvent {
  contentOffset: { x?: number; y: number };
  contentSize: { width?: number; height: number };
  layoutMeasurement: { width?: number; height: number };
}

interface ScrollHandler {
  onScroll?: (event: ScrollEvent) => void;
}

/** Build a realistic scroll event. contentSize defaults to a tall page. */
const makeScrollEvent = (
  y: number,
  opts: { contentHeight?: number; viewportHeight?: number } = {},
): ScrollEvent => ({
  contentOffset: { x: 0, y },
  contentSize: { width: 390, height: opts.contentHeight ?? 2000 },
  layoutMeasurement: { width: 390, height: opts.viewportHeight ?? 800 },
});

describe('useDiscoveryScrollManager', () => {
  const createSharedValue = (initial: number) =>
    ({ value: initial }) as unknown as SharedValue<number>;

  const createDefaultProps = (overrides = {}) => ({
    walletHeaderHeight: 56,
    walletHeaderTranslateY: createSharedValue(0),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // The global Reanimated.setUpTests() in testSetup.js may override the
    // module-level jest.mock factory. Patch all used functions at runtime so
    // worklet-called and JS-thread functions resolve to our controllable mocks.
    const reanimated = jest.requireMock('react-native-reanimated');
    reanimated.withTiming = mockWithTiming;
    reanimated.withDelay = mockWithDelay;
    reanimated.runOnJS = mockRunOnJS;
    mockWithTiming.mockImplementation((toValue: unknown) => toValue);
    mockWithDelay.mockImplementation(
      (_delay: unknown, animation: unknown) => animation,
    );
  });

  // ─── exports ───────────────────────────────────────────────────────────────

  describe('exports', () => {
    it('exports ANIMATION_DURATION as 300', () => {
      expect(ANIMATION_DURATION).toBe(300);
    });

    it('exports SCROLL_THRESHOLD as 100', () => {
      expect(SCROLL_THRESHOLD).toBe(100);
    });
  });

  describe('initialization', () => {
    it('returns required properties', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps()),
      );

      expect(typeof result.current.headerHidden).toBe('boolean');
      expect(typeof result.current.onTabEnter).toBe('function');
      expect(result.current.scrollHandler).toBeDefined();
    });

    it('initializes headerHidden as false', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps()),
      );

      expect(result.current.headerHidden).toBe(false);
    });

    it('works without optional walletHeaderTranslateY', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager({ walletHeaderHeight: 56 }),
      );

      expect(result.current.headerHidden).toBe(false);
      expect(result.current.scrollHandler).toBeDefined();
    });

    it('works without any optional props', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager({ walletHeaderHeight: 56 }),
      );

      expect(result.current.headerHidden).toBe(false);
    });
  });

  describe('walletHeaderHeight sync', () => {
    it('updates sharedHeaderHeight when walletHeaderHeight prop changes', () => {
      const props = createDefaultProps({ walletHeaderHeight: 56 });

      const { rerender } = renderHook(
        (p: typeof props) => useDiscoveryScrollManager(p),
        { initialProps: props },
      );

      expect(() =>
        rerender({ ...props, walletHeaderHeight: 80 }),
      ).not.toThrow();
    });
  });

  describe('scrollHandler', () => {
    it('processes a scroll event without throwing', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps()),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      expect(() => {
        handler.onScroll?.(makeScrollEvent(0));
      }).not.toThrow();
    });

    it('does not hide header when accumulated scroll is below threshold', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps()),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      act(() => {
        handler.onScroll?.(makeScrollEvent(0));
        handler.onScroll?.(makeScrollEvent(50)); // 50px < SCROLL_THRESHOLD (100)
      });

      expect(result.current.headerHidden).toBe(false);
    });

    it('hides header after scrolling down past the threshold', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps()),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      act(() => {
        handler.onScroll?.(makeScrollEvent(0));
        handler.onScroll?.(makeScrollEvent(101)); // > 100px threshold
      });

      expect(result.current.headerHidden).toBe(true);
    });

    it('shows header again after scrolling up past threshold when hidden', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps()),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      act(() => {
        handler.onScroll?.(makeScrollEvent(0));
        handler.onScroll?.(makeScrollEvent(200));
      });

      expect(result.current.headerHidden).toBe(true);

      act(() => {
        handler.onScroll?.(makeScrollEvent(200));
        handler.onScroll?.(makeScrollEvent(50)); // -150px upward (> threshold)
      });

      expect(result.current.headerHidden).toBe(false);
    });

    it('shows header immediately when scrolled back to top', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps()),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      act(() => {
        handler.onScroll?.(makeScrollEvent(0));
        handler.onScroll?.(makeScrollEvent(200));
      });
      expect(result.current.headerHidden).toBe(true);

      act(() => {
        handler.onScroll?.(makeScrollEvent(0)); // atTop forces show
      });
      expect(result.current.headerHidden).toBe(false);
    });

    it('resets accumulated delta when scroll direction reverses', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps()),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      act(() => {
        // Scroll down 80px (below threshold)
        handler.onScroll?.(makeScrollEvent(0));
        handler.onScroll?.(makeScrollEvent(80));

        // Reverse — accumulated delta resets, only 20px down so far
        handler.onScroll?.(makeScrollEvent(60));
        handler.onScroll?.(makeScrollEvent(80)); // 20px down — still below threshold
      });

      expect(result.current.headerHidden).toBe(false);
    });

    it('ignores zero-delta events', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps()),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      act(() => {
        handler.onScroll?.(makeScrollEvent(50));
        handler.onScroll?.(makeScrollEvent(50)); // delta = 0, should be ignored
      });

      expect(result.current.headerHidden).toBe(false);
    });

    it('ignores bounce events past the bottom edge', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps()),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      act(() => {
        handler.onScroll?.(makeScrollEvent(0));
        handler.onScroll?.(makeScrollEvent(200));
      });
      expect(result.current.headerHidden).toBe(true);

      act(() => {
        // Bounce: scroll past bottom (contentHeight=2000, viewport=800 → max=1200)
        handler.onScroll?.(
          makeScrollEvent(1250, { contentHeight: 2000, viewportHeight: 800 }),
        );
        // Snapback upward should NOT re-show header (atBottom guard)
        handler.onScroll?.(
          makeScrollEvent(1200, { contentHeight: 2000, viewportHeight: 800 }),
        );
      });

      expect(result.current.headerHidden).toBe(true);
    });

    it('invokes onPortfolioScroll on every scroll event', () => {
      const onPortfolioScroll = jest.fn();
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps({ onPortfolioScroll })),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;
      act(() => {
        handler.onScroll?.(makeScrollEvent(10));
        handler.onScroll?.(makeScrollEvent(20));
      });

      expect(onPortfolioScroll).toHaveBeenCalledTimes(2);
    });

    it('invokes onScrollEvent with scrollY and viewportHeight on every event', () => {
      const onScrollEvent = jest.fn();
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps({ onScrollEvent })),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;
      act(() => {
        handler.onScroll?.(makeScrollEvent(42, { viewportHeight: 800 }));
      });

      expect(onScrollEvent).toHaveBeenCalledWith(42, 800);
    });

    it('invokes both onPortfolioScroll and onScrollEvent in the same scroll event', () => {
      const onPortfolioScroll = jest.fn();
      const onScrollEvent = jest.fn();
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(
          createDefaultProps({ onPortfolioScroll, onScrollEvent }),
        ),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;
      act(() => {
        handler.onScroll?.(makeScrollEvent(10, { viewportHeight: 750 }));
      });

      expect(onPortfolioScroll).toHaveBeenCalledTimes(1);
      expect(onScrollEvent).toHaveBeenCalledWith(10, 750);
    });

    it('calls onHeaderHiddenChange(true) when header hides', () => {
      const onHeaderHiddenChange = jest.fn();
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps({ onHeaderHiddenChange })),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;
      act(() => {
        handler.onScroll?.(makeScrollEvent(0));
        handler.onScroll?.(makeScrollEvent(200));
      });

      expect(onHeaderHiddenChange).toHaveBeenCalledWith(true);
    });

    it('calls onHeaderHiddenChange(false) when header shows after scrolling up', () => {
      const onHeaderHiddenChange = jest.fn();
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps({ onHeaderHiddenChange })),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      act(() => {
        handler.onScroll?.(makeScrollEvent(0));
        handler.onScroll?.(makeScrollEvent(200));
      });
      onHeaderHiddenChange.mockClear();

      act(() => {
        handler.onScroll?.(makeScrollEvent(200));
        handler.onScroll?.(makeScrollEvent(50));
      });

      expect(onHeaderHiddenChange).toHaveBeenCalledWith(false);
    });

    it('calls onHeaderHiddenChange(false) when scrolled back to top', () => {
      const onHeaderHiddenChange = jest.fn();
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps({ onHeaderHiddenChange })),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      act(() => {
        handler.onScroll?.(makeScrollEvent(0));
        handler.onScroll?.(makeScrollEvent(200));
      });
      onHeaderHiddenChange.mockClear();

      act(() => {
        handler.onScroll?.(makeScrollEvent(0));
      });

      expect(onHeaderHiddenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('onTabEnter', () => {
    it('does not throw when header is visible', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps()),
      );

      expect(() => {
        act(() => {
          result.current.onTabEnter();
        });
      }).not.toThrow();

      expect(result.current.headerHidden).toBe(false);
    });

    it('does not throw after scrolling past threshold', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps()),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;
      act(() => {
        handler.onScroll?.(makeScrollEvent(0));
        handler.onScroll?.(makeScrollEvent(200));
      });

      expect(() => {
        act(() => {
          result.current.onTabEnter();
        });
      }).not.toThrow();
    });

    it('does not throw on re-entry after header was hidden by scroll', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps()),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;
      act(() => {
        handler.onScroll?.(makeScrollEvent(0));
        handler.onScroll?.(makeScrollEvent(200));
      });
      expect(result.current.headerHidden).toBe(true);

      expect(() => {
        act(() => {
          result.current.onTabEnter();
        });
      }).not.toThrow();
    });

    it('shows header when re-entering a tab that was at the top', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps()),
      );

      act(() => {
        result.current.onTabEnter();
      });

      expect(result.current.headerHidden).toBe(false);
    });

    it('calls onHeaderHiddenChange(true) when entering a tab with hidden header', () => {
      const onHeaderHiddenChange = jest.fn();
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps({ onHeaderHiddenChange })),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;
      act(() => {
        handler.onScroll?.(makeScrollEvent(0));
        handler.onScroll?.(makeScrollEvent(200));
      });
      onHeaderHiddenChange.mockClear();

      act(() => {
        result.current.onTabEnter();
      });

      expect(onHeaderHiddenChange).toHaveBeenCalledWith(true);
    });

    it('calls onHeaderHiddenChange(false) when entering a tab with visible header', () => {
      const onHeaderHiddenChange = jest.fn();
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps({ onHeaderHiddenChange })),
      );

      act(() => {
        result.current.onTabEnter();
      });

      expect(onHeaderHiddenChange).toHaveBeenCalledWith(false);
    });

    it('skips settling scroll events after a tab switch', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps()),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      act(() => {
        result.current.onTabEnter();
      });

      // Fire 5 settling events (tabSwitchEventsToSkip = 5) — none should hide header
      act(() => {
        for (let i = 0; i < 5; i++) {
          handler.onScroll?.(makeScrollEvent(500));
        }
      });

      expect(result.current.headerHidden).toBe(false);
    });

    it('processes scroll normally after the settling window expires', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps()),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      act(() => {
        result.current.onTabEnter();
      });

      // Burn through all 5 skip slots
      act(() => {
        for (let i = 0; i < 5; i++) {
          handler.onScroll?.(makeScrollEvent(0));
        }
      });

      // Now normal scroll should work
      act(() => {
        handler.onScroll?.(makeScrollEvent(0));
        handler.onScroll?.(makeScrollEvent(200));
      });

      expect(result.current.headerHidden).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('unmounts without errors', () => {
      const { unmount } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps()),
      );

      expect(() => unmount()).not.toThrow();
    });
  });
});
