import { useEffect } from 'react';
import {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
  type AnimatedStyle,
} from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';
import { AnimationDuration } from '../../../../../component-library/constants/animation.constants';
import usePrevious from '../../../../hooks/usePrevious';

/**
 * How long the emphasis pulse runs. Matches the list's reorder slide so the
 * pulse resolves exactly as the row settles into its new position.
 */
export const RANK_CHANGE_DURATION = AnimationDuration.Slowly;

/**
 * Opacity the row starts from when it moves. Climbing rows barely dip; falling
 * rows dip further, so a row losing ground reads as receding rather than just
 * sliding. Both resolve to fully opaque.
 */
const RISE_START_OPACITY = 0.75;
const FALL_START_OPACITY = 0.6;

/**
 * Peak scale at the midpoint of the pulse. Deliberately tiny — enough to give
 * the movement some weight without the row visibly zooming.
 */
const RISE_PEAK_SCALE = 1.02;
const FALL_PEAK_SCALE = 0.99;

/**
 * Animates a row's reaction to its own rank changing: a short opacity-and-scale
 * pulse whose direction depends on whether the trader climbed or fell.
 *
 * This only covers the row's *reaction*. The positional slide is owned by the
 * list's `itemLayoutAnimation`, which moves the cell to its new offset over the
 * same duration.
 *
 * No pulse fires on first render (there is no previous rank to compare), and
 * none fires when the user has Reduce Motion enabled — in that case the row
 * jumps straight to its new position with no fade or scale.
 *
 * @param rank - The row's current 1-based rank. Changing it triggers the pulse.
 * @returns An animated style to spread onto the row's outermost `Animated.View`.
 */
export const useRankChangeAnimation = (
  rank: number,
): AnimatedStyle<ViewStyle> => {
  const previousRank = usePrevious(rank);
  const prefersReducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (prefersReducedMotion) return;
    // First render, or the trader held their position.
    if (previousRank === undefined || previousRank === rank) return;

    const hasRisen = rank < previousRank;

    opacity.value = hasRisen ? RISE_START_OPACITY : FALL_START_OPACITY;
    opacity.value = withTiming(1, { duration: RANK_CHANGE_DURATION });

    scale.value = withSequence(
      withTiming(hasRisen ? RISE_PEAK_SCALE : FALL_PEAK_SCALE, {
        duration: RANK_CHANGE_DURATION / 2,
      }),
      withTiming(1, { duration: RANK_CHANGE_DURATION / 2 }),
    );
  }, [rank, previousRank, prefersReducedMotion, opacity, scale]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
};
