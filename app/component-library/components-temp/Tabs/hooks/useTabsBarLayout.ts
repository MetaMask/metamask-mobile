// Third party dependencies.
import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  RefObject,
} from 'react';
import { Animated, ScrollView, LayoutChangeEvent } from 'react-native';

export interface TabLayoutRect {
  x: number;
  width: number;
}

/**
 * Callback invoked when the underline needs to move.
 * - `isFirstTime` true: snap values immediately (call setValue), return null.
 * - `isFirstTime` false: create and return an animation; the hook will start it.
 */
export type OnAnimateToTab = (
  layout: TabLayoutRect,
  isFirstTime: boolean,
) => Animated.CompositeAnimation | null;

interface UseTabsBarLayoutOptions {
  tabs: { key: string }[];
  activeIndex: number;
  fillWidth?: boolean;
  /** When true, scroll snaps animated after first init (TabsBar). When false, always instant (TabsIconBar). */
  scrollAnimated?: boolean;
  scrollViewRef: RefObject<ScrollView | null>;
  onAnimateToTab: OnAnimateToTab;
}

interface UseTabsBarLayoutResult {
  isInitialized: boolean;
  scrollEnabled: boolean;
  handleContainerLayout: (event: LayoutChangeEvent) => void;
  handleTabLayout: (index: number, event: LayoutChangeEvent) => void;
}

export function useTabsBarLayout({
  tabs,
  activeIndex,
  fillWidth = false,
  scrollAnimated = true,
  scrollViewRef,
  onAnimateToTab,
}: UseTabsBarLayoutOptions): UseTabsBarLayoutResult {
  const tabLayouts = useRef<TabLayoutRect[]>([]);
  const currentAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const rafCallbackId = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [layoutsReady, setLayoutsReady] = useState(false);
  const activeIndexRef = useRef(activeIndex);
  const onAnimateToTabRef = useRef(onAnimateToTab);

  const [scrollEnabled, setScrollEnabled] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // Always keep the callback ref current without triggering re-renders
  useEffect(() => {
    onAnimateToTabRef.current = onAnimateToTab;
  });

  const tabKeys = useMemo(() => tabs.map((tab) => tab.key).join(','), [tabs]);
  const prevTabKeys = useRef('');
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      prevTabKeys.current = tabKeys;
      isInitialMount.current = false;
      return;
    }

    const shouldReset =
      tabLayouts.current.length !== tabs.length ||
      prevTabKeys.current !== tabKeys;

    if (shouldReset) {
      prevTabKeys.current = tabKeys;
      tabLayouts.current = Array.from({ length: tabs.length });
      setIsInitialized(false);
      setLayoutsReady(false);
      setScrollEnabled(false);

      if (currentAnimation.current) {
        currentAnimation.current.stop();
        currentAnimation.current = null;
      }

      setContainerWidth(0);
    }
  }, [tabKeys, tabs.length]);

  // Invalidate stored layouts when rendering mode switches (scroll ↔ non-scroll)
  // so stale x-offsets don't drive the underline before fresh measurements arrive.
  const prevScrollEnabled = useRef(scrollEnabled);
  useEffect(() => {
    if (prevScrollEnabled.current !== scrollEnabled) {
      prevScrollEnabled.current = scrollEnabled;
      tabLayouts.current = Array.from({ length: tabs.length });
      setIsInitialized(false);
      setLayoutsReady(false);
      if (currentAnimation.current) {
        currentAnimation.current.stop();
        currentAnimation.current = null;
      }
    }
  }, [scrollEnabled, tabs.length]);

  const animateToTab = useCallback(
    (targetIndex: number) => {
      if (currentAnimation.current) {
        currentAnimation.current.stop();
        currentAnimation.current = null;
      }

      if (targetIndex < 0 || targetIndex >= tabs.length) return;

      const layout = tabLayouts.current[targetIndex];
      if (!layout || layout.width <= 0) return;

      const isFirstTime = !isInitialized;

      const animation = onAnimateToTabRef.current(layout, isFirstTime);

      if (isFirstTime) {
        setIsInitialized(true);
      } else if (animation) {
        currentAnimation.current = animation;
        animation.start((result) => {
          if (result.finished && currentAnimation.current === animation) {
            currentAnimation.current = null;
          }
        });
      }

      if (scrollEnabled && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          x: Math.max(0, layout.x - 50),
          animated: scrollAnimated && !isFirstTime,
        });
      }
    },
    [scrollEnabled, scrollAnimated, tabs.length, isInitialized, scrollViewRef],
  );

  useEffect(() => {
    if (activeIndex >= 0 && layoutsReady) {
      animateToTab(activeIndex);
    }
  }, [activeIndex, layoutsReady, animateToTab]);

  useEffect(() => {
    if (fillWidth) return;
    if (containerWidth > 0 && tabLayouts.current.length === tabs.length) {
      const allLayoutsDefined = tabLayouts.current.every(
        (layout) => layout && typeof layout.width === 'number',
      );

      if (allLayoutsDefined) {
        const totalTabsWidth = tabLayouts.current.reduce(
          (sum, l) => sum + l.width,
          0,
        );
        const gapsWidth = (tabs.length - 1) * 24;
        const shouldScroll = totalTabsWidth + gapsWidth > containerWidth - 32;
        setScrollEnabled(shouldScroll);
      }
    }
  }, [fillWidth, containerWidth, tabs.length]);

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const handleTabLayout = useCallback(
    (index: number, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;

      if (index < 0 || index >= tabs.length || width <= 0) return;

      const previous = tabLayouts.current[index];
      const hasSignificantChange =
        !previous ||
        Math.abs(previous.width - width) > 1 ||
        Math.abs(previous.x - x) > 1;

      tabLayouts.current[index] = { x, width };

      const allLayoutsReady = tabLayouts.current.every(
        (layout, i) => i >= tabs.length || (layout && layout.width > 0),
      );

      if (allLayoutsReady) {
        if (!layoutsReady || hasSignificantChange) {
          if (!layoutsReady) {
            setLayoutsReady(true);
          }

          if (layoutsReady && hasSignificantChange) {
            if (rafCallbackId.current !== null) {
              cancelAnimationFrame(rafCallbackId.current);
            }
            rafCallbackId.current = requestAnimationFrame(() => {
              rafCallbackId.current = null;
              animateToTab(activeIndexRef.current);
            });
          }

          if (!fillWidth && containerWidth > 0) {
            const totalWidth = tabLayouts.current.reduce(
              (sum, l) => sum + (l?.width || 0),
              0,
            );
            const gapsWidth = (tabs.length - 1) * 24;
            const shouldScroll = totalWidth + gapsWidth > containerWidth - 32;
            setScrollEnabled(shouldScroll);
          }
        }
      }
    },
    [fillWidth, tabs.length, layoutsReady, containerWidth, animateToTab],
  );

  useEffect(
    () => () => {
      if (currentAnimation.current) {
        currentAnimation.current.stop();
        currentAnimation.current = null;
      }
      if (rafCallbackId.current !== null) {
        cancelAnimationFrame(rafCallbackId.current);
        rafCallbackId.current = null;
      }
    },
    [],
  );

  return {
    isInitialized,
    scrollEnabled,
    handleContainerLayout,
    handleTabLayout,
  };
}
