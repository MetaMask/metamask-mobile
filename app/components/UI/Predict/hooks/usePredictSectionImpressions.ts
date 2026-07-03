import { useCallback, useEffect, useRef } from 'react';
import { LayoutChangeEvent } from 'react-native';
import {
  runOnJS,
  useAnimatedReaction,
  type SharedValue,
} from 'react-native-reanimated';
import {
  createSectionViewTracker,
  type SectionViewTracker,
} from '../utils/sectionViewTracker';

export interface UsePredictSectionImpressionsParams {
  /** Scroll offset shared value driving the page (from usePredictStackedHeader). */
  scrollY: SharedValue<number>;
  /** Fired once per section per session when it dwells in view. */
  onSectionViewed: (sectionId: string) => void;
  threshold?: number;
  dwellMs?: number;
}

export interface UsePredictSectionImpressionsResult {
  /** Returns an `onLayout` handler that measures a section for impression tracking. */
  registerSection: (sectionId: string) => (event: LayoutChangeEvent) => void;
  /** `onLayout` for the scroll container — reports the viewport height. */
  setViewportHeight: (event: LayoutChangeEvent) => void;
  /** Clears fired ids + pending timers (call on focus so re-entry can re-fire). */
  reset: () => void;
}

/**
 * Scroll-into-view impression tracker for the PredictHome sections.
 *
 * The home is a single non-virtualized `Animated.ScrollView`, so every section
 * mounts at once — mount-based "viewed" would fire for all sections on every
 * load regardless of scroll. This hook instead reuses the page's `scrollY`
 * shared value and each section's measured layout to fire `onSectionViewed`
 * only once a section has been sufficiently visible for a dwell period
 * (see `sectionImpressionTracker`). All visibility/dwell logic lives in the
 * framework-agnostic tracker; this hook is glue.
 */
export const usePredictSectionImpressions = ({
  scrollY,
  onSectionViewed,
  threshold,
  dwellMs,
}: UsePredictSectionImpressionsParams): UsePredictSectionImpressionsResult => {
  const onViewedRef = useRef(onSectionViewed);
  useEffect(() => {
    onViewedRef.current = onSectionViewed;
  }, [onSectionViewed]);

  const trackerRef = useRef<SectionViewTracker | undefined>(undefined);
  if (!trackerRef.current) {
    trackerRef.current = createSectionViewTracker({
      onViewed: (sectionId) => onViewedRef.current(sectionId),
      threshold,
      dwellMs,
    });
  }

  useEffect(() => {
    const tracker = trackerRef.current;
    return () => tracker?.destroy();
  }, []);

  const handleScrollY = useCallback((value: number) => {
    trackerRef.current?.setScrollY(value);
  }, []);

  useAnimatedReaction(
    () => scrollY.value,
    (value) => {
      'worklet';
      runOnJS(handleScrollY)(value);
    },
    [handleScrollY],
  );

  const registerSection = useCallback(
    (sectionId: string) => (event: LayoutChangeEvent) => {
      const { y, height } = event.nativeEvent.layout;
      trackerRef.current?.setLayout(sectionId, { top: y, height });
    },
    [],
  );

  const setViewportHeight = useCallback((event: LayoutChangeEvent) => {
    trackerRef.current?.setViewportHeight(event.nativeEvent.layout.height);
  }, []);

  const reset = useCallback(() => {
    trackerRef.current?.reset();
  }, []);

  return { registerSection, setViewportHeight, reset };
};
