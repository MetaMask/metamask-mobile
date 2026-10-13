import { useCallback, useEffect, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { getHardwareTier } from '../../../../../util/deviceCapability';

/** Lets the sheet's own slide-up (~300ms) land before the line starts. */
export const LINE_DRAW_DELAY_MS = 300;
export const LINE_DRAW_DURATION_MS = 700;
export const OVERLAY_FADE_DURATION_MS = 200;
export const DETAILS_EXPAND_DURATION_MS = 350;

const EASE_OUT = Easing.out(Easing.cubic);

export interface UseTwoStepSheetRevealParams {
  /** Prices settled (loaded, failed or empty) so step 1 can run. */
  isChartReady: boolean;
  /** Whether there is a line to draw. Without one, step 2 starts at once. */
  hasChartData: boolean;
}

export interface UseTwoStepSheetRevealResult {
  /** False on LOW hardware and with reduce motion: render at full height. */
  isAnimated: boolean;
  isExpanded: boolean;
  /** 0 → 1 as the line draws. */
  lineProgress: SharedValue<number>;
  /** Markers and level lines, faded in once the line is drawn. */
  overlayStyle: ReturnType<typeof useAnimatedStyle>;
  /** Clips the step-2 content; its height grows the sheet upward. */
  detailsContainerStyle: ReturnType<typeof useAnimatedStyle>;
  detailsContentStyle: ReturnType<typeof useAnimatedStyle>;
  onDetailsLayout: (event: LayoutChangeEvent) => void;
}

/**
 * Two-step opening for the position sheet. Step 1: the sheet rises to show
 * the header and chart while the line draws itself. Step 2: the sheet grows
 * to its full content height and the summary, post and footer fade in.
 *
 * The design-system sheet is pinned to the bottom of the screen and sizes
 * itself to its content, so animating the height of the step-2 container is
 * what makes the sheet grow upward — no snap points needed.
 */
export function useTwoStepSheetReveal({
  isChartReady,
  hasChartData,
}: UseTwoStepSheetRevealParams): UseTwoStepSheetRevealResult {
  const prefersReducedMotion = useReducedMotion();
  const isAnimated = !prefersReducedMotion && getHardwareTier() !== 'LOW';

  const lineProgress = useSharedValue(isAnimated ? 0 : 1);
  const overlayOpacity = useSharedValue(isAnimated ? 0 : 1);
  const detailsHeight = useSharedValue(0);
  const detailsOpacity = useSharedValue(isAnimated ? 0 : 1);
  const [isExpanded, setIsExpanded] = useState(!isAnimated);
  const [detailsMeasuredHeight, setDetailsMeasuredHeight] = useState(0);

  const expand = useCallback(() => setIsExpanded(true), []);

  useEffect(() => {
    if (!isAnimated || !isChartReady || isExpanded) return;
    if (!hasChartData) {
      overlayOpacity.value = 1;
      expand();
      return;
    }
    lineProgress.value = withDelay(
      LINE_DRAW_DELAY_MS,
      withTiming(
        1,
        { duration: LINE_DRAW_DURATION_MS, easing: EASE_OUT },
        (finished) => {
          if (!finished) return;
          overlayOpacity.value = withTiming(1, {
            duration: OVERLAY_FADE_DURATION_MS,
          });
          scheduleOnRN(expand);
        },
      ),
    );
  }, [
    isAnimated,
    isChartReady,
    hasChartData,
    isExpanded,
    expand,
    lineProgress,
    overlayOpacity,
  ]);

  useEffect(() => {
    if (!isAnimated || !isExpanded || detailsMeasuredHeight === 0) return;
    detailsHeight.value = withTiming(detailsMeasuredHeight, {
      duration: DETAILS_EXPAND_DURATION_MS,
      easing: EASE_OUT,
    });
    detailsOpacity.value = withTiming(1, {
      duration: DETAILS_EXPAND_DURATION_MS,
    });
  }, [
    isAnimated,
    isExpanded,
    detailsMeasuredHeight,
    detailsHeight,
    detailsOpacity,
  ]);

  const onDetailsLayout = useCallback((event: LayoutChangeEvent) => {
    setDetailsMeasuredHeight(Math.ceil(event.nativeEvent.layout.height));
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));
  const detailsContainerStyle = useAnimatedStyle(() => ({
    height: detailsHeight.value,
    overflow: 'hidden',
  }));
  const detailsContentStyle = useAnimatedStyle(() => ({
    opacity: detailsOpacity.value,
  }));

  return {
    isAnimated,
    isExpanded,
    lineProgress,
    overlayStyle,
    detailsContainerStyle,
    detailsContentStyle,
    onDetailsLayout,
  };
}
