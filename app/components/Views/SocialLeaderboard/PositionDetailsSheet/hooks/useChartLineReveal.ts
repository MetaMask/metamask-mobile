import { useEffect } from 'react';
import {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { getHardwareTier } from '../../../../../util/deviceCapability';

/** Lets the sheet's own slide-up (~300ms) land before the line starts. */
export const LINE_DRAW_DELAY_MS = 300;
export const LINE_DRAW_DURATION_MS = 700;
export const OVERLAY_FADE_DURATION_MS = 200;

const EASE_OUT = Easing.out(Easing.cubic);

export interface UseChartLineRevealParams {
  /** Prices settled (loaded, failed or empty). */
  isChartReady: boolean;
  /** Whether there is a line to draw. */
  hasChartData: boolean;
}

export interface UseChartLineRevealResult {
  /** False on LOW hardware and with reduce motion: the line shows drawn. */
  isAnimated: boolean;
  /** 0 → 1 as the line draws. */
  lineProgress: SharedValue<number>;
  /** Markers and level lines, faded in once the line is drawn. */
  overlayStyle: ReturnType<typeof useAnimatedStyle>;
}

/**
 * Draws the position chart line once its prices arrive. The sheet itself
 * opens at full height straight away, so the line never holds up the rest of
 * the content.
 */
export function useChartLineReveal({
  isChartReady,
  hasChartData,
}: UseChartLineRevealParams): UseChartLineRevealResult {
  const prefersReducedMotion = useReducedMotion();
  const isAnimated = !prefersReducedMotion && getHardwareTier() !== 'LOW';

  const lineProgress = useSharedValue(isAnimated ? 0 : 1);
  const overlayOpacity = useSharedValue(isAnimated ? 0 : 1);

  useEffect(() => {
    if (!isAnimated || !isChartReady || lineProgress.value !== 0) return;
    if (!hasChartData) {
      overlayOpacity.value = 1;
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
        },
      ),
    );
  }, [isAnimated, isChartReady, hasChartData, lineProgress, overlayOpacity]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  return { isAnimated, lineProgress, overlayStyle };
}
