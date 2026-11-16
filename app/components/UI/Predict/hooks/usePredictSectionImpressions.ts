import { useCallback, useEffect, useRef } from 'react';
import { LayoutChangeEvent } from 'react-native';
import { scheduleOnRN } from 'react-native-worklets';
import {
  useAnimatedReaction,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import {
  createSectionViewTracker,
  DEFAULT_DWELL_MS,
  type SectionViewTracker,
} from '../utils/sectionViewTracker';

/**
 * How often a scroll offset is copied to the JS impression tracker.
 * Dwell is {@link DEFAULT_DWELL_MS}, so a sample this often still sees a
 * section that actually rests in view. Bridging every frame wakes JS for the
 * whole gesture.
 * shortcut: a section can be counted up to this late, or a pass shorter than
 * dwell plus this gap can still count; sample faster if impression timing gets stricter.
 */
export const SECTION_IMPRESSION_SCROLL_SAMPLE_MS = Math.min(
  100,
  DEFAULT_DWELL_MS,
);

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
 * mounts at once. Mount-based "viewed" would fire for all sections on every
 * load regardless of scroll. This hook instead reuses the page's `scrollY`
 * shared value and each section's measured layout to fire `onSectionViewed`
 * only once a section has been sufficiently visible for a dwell period
 * (see `sectionViewTracker`). Scroll offsets are sampled on the UI thread and
 * copied to JS about ten times a second, not once per frame. All
 * visibility/dwell logic lives in the framework-agnostic tracker; this hook
 * is glue.
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
  const trailingSampleRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const sampleWindowOpen = useSharedValue(false);
  const latestScrollY = useSharedValue(0);

  if (!trackerRef.current) {
    trackerRef.current = createSectionViewTracker({
      onViewed: (sectionId) => onViewedRef.current(sectionId),
      threshold,
      dwellMs,
    });
  }

  useEffect(() => {
    const tracker = trackerRef.current;
    return () => {
      if (trailingSampleRef.current) {
        clearTimeout(trailingSampleRef.current);
        trailingSampleRef.current = undefined;
      }
      sampleWindowOpen.value = false;
      tracker?.destroy();
      // A sample already queued must not start a new dwell after unmount.
      trackerRef.current = undefined;
    };
  }, [sampleWindowOpen]);

  const publishScrollSample = useCallback(
    (value: number) => {
      const tracker = trackerRef.current;
      if (!tracker) {
        return;
      }
      tracker.setScrollY(value);
      if (trailingSampleRef.current) {
        clearTimeout(trailingSampleRef.current);
      }
      trailingSampleRef.current = setTimeout(() => {
        trailingSampleRef.current = undefined;
        sampleWindowOpen.value = false;
        trackerRef.current?.setScrollY(latestScrollY.value);
      }, SECTION_IMPRESSION_SCROLL_SAMPLE_MS);
    },
    [latestScrollY, sampleWindowOpen],
  );

  useAnimatedReaction(
    () => scrollY.value,
    (value) => {
      'worklet';
      latestScrollY.value = value;
      if (sampleWindowOpen.value) {
        return;
      }
      sampleWindowOpen.value = true;
      scheduleOnRN(publishScrollSample, value);
    },
    [latestScrollY, publishScrollSample, sampleWindowOpen],
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
