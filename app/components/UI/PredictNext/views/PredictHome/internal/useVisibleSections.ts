import { useCallback, useRef, useState } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import {
  useAnimatedReaction,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

/**
 * Smallest scroll movement that is forwarded from the UI thread. The visible
 * set cannot change for a move shorter than this unless a section is shorter
 * than this too, and the settle handlers below recompute from the exact
 * resting offset, so nothing is lost by coalescing the frames in between.
 */
const SCROLL_DELTA_THRESHOLD_PX = 8;

interface SectionLayout {
  y: number;
  height: number;
}

interface UseVisibleSectionsOptions<TKey extends string> {
  keys: readonly TKey[];
  /** Vertical scroll offset of the ScrollView, driven on the UI thread. */
  scrollY: SharedValue<number>;
}

interface UseVisibleSectionsResult<TKey extends string> {
  /** Keys of the sections that intersect the viewport, in `keys` order. */
  visibleKeys: readonly TKey[];
  /** `onLayout` for the ScrollView itself (the viewport). */
  onViewportLayout: (event: LayoutChangeEvent) => void;
  /**
   * `onLayout` for the single element wrapping every section. Section frames
   * are measured against their own parent, so without this the parent is
   * assumed to sit at content offset 0.
   */
  onContentLayout: (event: LayoutChangeEvent) => void;
  /** `onLayout` for one section, measured within the content wrapper. */
  onSectionLayout: (key: TKey) => (event: LayoutChangeEvent) => void;
  /**
   * `onScrollEndDrag` / `onMomentumScrollEnd` for the ScrollView, so the
   * resting offset is always measured exactly regardless of
   * {@link SCROLL_DELTA_THRESHOLD_PX}.
   */
  onScrollSettled: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

const sameKeys = <TKey>(a: readonly TKey[], b: readonly TKey[]) =>
  a.length === b.length && a.every((key, index) => key === b[index]);

/**
 * Section-level visibility over a vertical ScrollView, from scroll-position
 * math: a section is visible while any part of it overlaps the viewport.
 *
 * Granularity is deliberately coarse. Home shows a handful of short sections,
 * so tracking whole sections (not cards) is enough to drop live data for what
 * is off screen, and needs no per-card measurement. A section or viewport that
 * has not been measured yet counts as visible, so the first render is live
 * before layout settles.
 *
 * Section frames come from `onLayout`, which reports coordinates relative to
 * the section's own parent. Every section must therefore share one wrapper
 * whose frame is reported through `onContentLayout`; the wrapper's `y` is
 * added back so content-container padding or a sibling header above it cannot
 * silently skew the math.
 */
export const useVisibleSections = <TKey extends string>({
  keys,
  scrollY,
}: UseVisibleSectionsOptions<TKey>): UseVisibleSectionsResult<TKey> => {
  const [visibleKeys, setVisibleKeys] = useState<readonly TKey[]>(keys);
  const keysRef = useRef(keys);
  keysRef.current = keys;
  const layoutsRef = useRef(new Map<TKey, SectionLayout>());
  const sectionHandlersRef = useRef(
    new Map<TKey, (event: LayoutChangeEvent) => void>(),
  );
  const viewportHeightRef = useRef<number | undefined>(undefined);
  const contentYRef = useRef(0);
  const offsetRef = useRef(0);
  // Last offset handed to the JS thread. Compared against instead of the
  // reaction's `previous`, which is the last *computed* value: a slow drag of
  // a pixel per frame would never cross the threshold against that.
  const lastSentOffset = useSharedValue(0);

  const recompute = useCallback(() => {
    const viewportHeight = viewportHeightRef.current;
    const top = offsetRef.current;
    const contentY = contentYRef.current;
    const next = keysRef.current.filter((key) => {
      const layout = layoutsRef.current.get(key);
      if (viewportHeight === undefined || !layout) {
        return true;
      }
      const sectionTop = contentY + layout.y;
      return (
        sectionTop < top + viewportHeight && sectionTop + layout.height > top
      );
    });
    setVisibleKeys((current) => (sameKeys(current, next) ? current : next));
  }, []);

  const onViewportLayout = useCallback(
    (event: LayoutChangeEvent) => {
      viewportHeightRef.current = event.nativeEvent.layout.height;
      recompute();
    },
    [recompute],
  );

  const onContentLayout = useCallback(
    (event: LayoutChangeEvent) => {
      contentYRef.current = event.nativeEvent.layout.y;
      recompute();
    },
    [recompute],
  );

  // Cached per key: `recompute` is stable, so a handler stays valid for the
  // life of the hook and the section Box never re-renders on prop identity.
  const onSectionLayout = useCallback(
    (key: TKey) => {
      const cached = sectionHandlersRef.current.get(key);
      if (cached) {
        return cached;
      }
      const handler = (event: LayoutChangeEvent) => {
        const { y, height } = event.nativeEvent.layout;
        layoutsRef.current.set(key, { y, height });
        recompute();
      };
      sectionHandlersRef.current.set(key, handler);
      return handler;
    },
    [recompute],
  );

  const onScrollOffset = useCallback(
    (offset: number) => {
      offsetRef.current = offset;
      recompute();
    },
    [recompute],
  );

  const onScrollSettled = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = event.nativeEvent.contentOffset.y;
      lastSentOffset.value = offset;
      onScrollOffset(offset);
    },
    [lastSentOffset, onScrollOffset],
  );

  useAnimatedReaction(
    () => scrollY.value,
    (offset) => {
      // Coalesce sub-threshold frames instead of crossing to the JS thread on
      // every one of them; the settle handlers cover the resting position.
      if (Math.abs(offset - lastSentOffset.value) < SCROLL_DELTA_THRESHOLD_PX) {
        return;
      }
      lastSentOffset.value = offset;
      scheduleOnRN(onScrollOffset, offset);
    },
    [onScrollOffset],
  );

  return {
    visibleKeys,
    onViewportLayout,
    onContentLayout,
    onSectionLayout,
    onScrollSettled,
  };
};
