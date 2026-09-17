import { useCallback, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import {
  runOnJS,
  useAnimatedReaction,
  type SharedValue,
} from 'react-native-reanimated';

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
  /** `onLayout` for one section, measured in scroll-content coordinates. */
  onSectionLayout: (key: TKey) => (event: LayoutChangeEvent) => void;
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
 */
export const useVisibleSections = <TKey extends string>({
  keys,
  scrollY,
}: UseVisibleSectionsOptions<TKey>): UseVisibleSectionsResult<TKey> => {
  const [visibleKeys, setVisibleKeys] = useState<readonly TKey[]>(keys);
  const keysRef = useRef(keys);
  keysRef.current = keys;
  const layoutsRef = useRef(new Map<TKey, SectionLayout>());
  const viewportHeightRef = useRef<number | undefined>(undefined);
  const offsetRef = useRef(0);

  const recompute = useCallback(() => {
    const viewportHeight = viewportHeightRef.current;
    const top = offsetRef.current;
    const next = keysRef.current.filter((key) => {
      const layout = layoutsRef.current.get(key);
      if (viewportHeight === undefined || !layout) {
        return true;
      }
      return layout.y < top + viewportHeight && layout.y + layout.height > top;
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

  const onSectionLayout = useCallback(
    (key: TKey) => (event: LayoutChangeEvent) => {
      const { y, height } = event.nativeEvent.layout;
      layoutsRef.current.set(key, { y, height });
      recompute();
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

  useAnimatedReaction(
    () => scrollY.value,
    (offset, previous) => {
      // Only real offset changes cross to the JS thread; the mount-time run
      // (previous === null) matters only if the list is already scrolled.
      if (offset === (previous ?? 0)) {
        return;
      }
      runOnJS(onScrollOffset)(offset);
    },
    [onScrollOffset],
  );

  return { visibleKeys, onViewportLayout, onSectionLayout };
};
