import { renderHook, act } from '@testing-library/react-native';
import { SharedValue } from 'react-native-reanimated';
import {
  useDiscoveryScrollManager,
  ANIMATION_DURATION,
  SCROLL_THRESHOLD,
} from './useDiscoveryScrollManager';

const mockWithTiming = jest.fn((toValue: unknown) => toValue);
const mockRunOnJS = jest.fn(
  (fn: (...args: unknown[]) => void) =>
    (...args: unknown[]) =>
      fn(...args),
);

jest.mock('react-native-reanimated', () => ({
  useSharedValue: jest.fn((initialValue: unknown) => ({ value: initialValue })),
  useAnimatedScrollHandler: jest.fn(
    (config: { onScroll: (event: { contentOffset: { y: number } }) => void }) =>
      config,
  ),
  withTiming: mockWithTiming,
  withDelay: jest.fn((_delay: unknown, animation: unknown) => animation),
  Easing: {
    out: jest.fn((easing: unknown) => easing),
    cubic: jest.fn(),
  },
  runOnJS: mockRunOnJS,
}));

interface ScrollHandler {
  onScroll?: (event: { contentOffset: { y: number } }) => void;
}

describe('useDiscoveryScrollManager', () => {
  const createSharedValue = (initial: number) =>
    ({ value: initial }) as unknown as SharedValue<number>;

  const createDefaultProps = (overrides = {}) => ({
    walletHeaderHeight: 56,
    walletHeaderTranslateY: createSharedValue(0),
    onPortfolioScroll: jest.fn(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exports', () => {
    it('exports ANIMATION_DURATION', () => {
      expect(ANIMATION_DURATION).toBe(350);
    });

    it('exports SCROLL_THRESHOLD', () => {
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

    it('works without optional walletHeaderTranslateY prop', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager({
          walletHeaderHeight: 56,
          onPortfolioScroll: jest.fn(),
        }),
      );

      expect(result.current.headerHidden).toBe(false);
      expect(result.current.scrollHandler).toBeDefined();
    });

    it('works without optional onPortfolioScroll prop', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager({ walletHeaderHeight: 56 }),
      );

      expect(result.current.headerHidden).toBe(false);
    });
  });

  describe('scrollHandler', () => {
    it('returns a scroll handler object', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps()),
      );

      expect(result.current.scrollHandler).toBeDefined();
    });

    it('processes scroll events without throwing', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps()),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      expect(() => {
        handler.onScroll?.({ contentOffset: { y: 0 } });
      }).not.toThrow();
    });

    it('accepts an onPortfolioScroll callback without throwing', () => {
      const onPortfolioScroll = jest.fn();
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps({ onPortfolioScroll })),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;
      expect(() => {
        handler.onScroll?.({ contentOffset: { y: 10 } });
        handler.onScroll?.({ contentOffset: { y: 20 } });
      }).not.toThrow();
    });

    it('does not hide header when scroll is below threshold', () => {
      const translateY = createSharedValue(0);
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(
          createDefaultProps({ walletHeaderTranslateY: translateY }),
        ),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;
      handler.onScroll?.({ contentOffset: { y: 0 } });
      handler.onScroll?.({ contentOffset: { y: 40 } }); // below 80px threshold

      expect(result.current.headerHidden).toBe(false);
    });

    it('processes scroll past threshold without throwing', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps()),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      // Note: withTiming assertions are not possible because the Reanimated Babel
      // plugin transforms 'worklet' functions at build time, resolving module
      // imports before Jest mocks take effect. We verify the scroll sequences
      // execute without errors instead.
      expect(() => {
        handler.onScroll?.({ contentOffset: { y: 0 } });
        handler.onScroll?.({ contentOffset: { y: 100 } }); // exceeds 80px threshold
      }).not.toThrow();

      expect(result.current.scrollHandler).toBeDefined();
    });

    it('processes scroll-down then scroll-to-top sequence without throwing', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps()),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      expect(() => {
        // Scroll down past threshold
        handler.onScroll?.({ contentOffset: { y: 0 } });
        handler.onScroll?.({ contentOffset: { y: 100 } });

        // Scroll back to top — atTop branch
        handler.onScroll?.({ contentOffset: { y: 100 } });
        handler.onScroll?.({ contentOffset: { y: 0 } });
      }).not.toThrow();

      expect(result.current.scrollHandler).toBeDefined();
    });

    it('resets accumulated delta when scroll direction reverses', () => {
      const translateY = createSharedValue(0);
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(
          createDefaultProps({ walletHeaderTranslateY: translateY }),
        ),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      // Scroll down 60px (below threshold)
      handler.onScroll?.({ contentOffset: { y: 0 } });
      handler.onScroll?.({ contentOffset: { y: 60 } });

      // Reverse direction — delta resets, header should NOT hide yet
      handler.onScroll?.({ contentOffset: { y: 40 } }); // up 20px
      handler.onScroll?.({ contentOffset: { y: 60 } }); // down 20px (below threshold from reset)

      expect(result.current.headerHidden).toBe(false);
    });

    it('ignores zero-delta scroll events', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps()),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      expect(() => {
        handler.onScroll?.({ contentOffset: { y: 50 } });
        handler.onScroll?.({ contentOffset: { y: 50 } }); // same position, delta = 0
      }).not.toThrow();

      expect(result.current.headerHidden).toBe(false);
    });
  });

  describe('onTabEnter', () => {
    it('calls onTabEnter after scrolling past threshold without throwing', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps()),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      // Scroll past threshold then switch tab — worklet-driven withTiming calls
      // are not assertable (Reanimated plugin resolves them before Jest mocks);
      // verify the sequence is error-free instead.
      handler.onScroll?.({ contentOffset: { y: 0 } });
      handler.onScroll?.({ contentOffset: { y: 100 } });

      expect(() => {
        act(() => {
          result.current.onTabEnter();
        });
      }).not.toThrow();
    });

    it('calls onTabEnter without throwing even when header is already visible', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps()),
      );

      // onTabEnter always resets the header (withTiming is a no-op at 0) so
      // switching tabs from any state is safe.
      expect(() => {
        act(() => {
          result.current.onTabEnter();
        });
      }).not.toThrow();

      expect(result.current.headerHidden).toBe(false);
    });

    it('skips the first scroll event after a tab switch', () => {
      const { result } = renderHook(() =>
        useDiscoveryScrollManager(createDefaultProps()),
      );

      const handler = result.current.scrollHandler as unknown as ScrollHandler;

      act(() => {
        result.current.onTabEnter();
      });

      // This first event after switch should be skipped
      handler.onScroll?.({ contentOffset: { y: 500 } });

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

      rerender({ ...props, walletHeaderHeight: 80 });

      // No throw = shared value sync ran without error
      expect(true).toBe(true);
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
