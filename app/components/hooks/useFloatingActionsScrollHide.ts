import { useEffect, useState } from 'react';
import { AnimationDuration } from '@metamask/design-tokens';
import {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

/** Space between floating actions and a surface (e.g. a footer sheet) below them. */
export const FLOATING_ACTIONS_BOTTOM_MARGIN = 16;
/** Scroll movement (px) ignored before the floating actions change state. */
export const FLOATING_ACTIONS_SCROLL_THRESHOLD = 8;
/** Near the top the floating actions always show. */
export const FLOATING_ACTIONS_MIN_HIDE_OFFSET = 48;

/**
 * Next floating-actions state for a scroll offset: shown at the top, hidden on
 * a scroll down past the top area, shown on a scroll up. Movement under the
 * threshold keeps the state and the anchor, so slow drags still add up.
 */
export const getFloatingActionsScrollState = (
  y: number,
  anchorY: number,
  isHidden: boolean,
): { isHidden: boolean; anchorY: number } => {
  'worklet';
  if (y <= 0) {
    return { isHidden: false, anchorY: y };
  }
  const delta = y - anchorY;
  if (Math.abs(delta) < FLOATING_ACTIONS_SCROLL_THRESHOLD) {
    return { isHidden, anchorY };
  }
  if (delta > 0) {
    return {
      isHidden: isHidden || y > FLOATING_ACTIONS_MIN_HIDE_OFFSET,
      anchorY: y,
    };
  }
  return { isHidden: false, anchorY: y };
};

export interface UseFloatingActionsScrollHideOptions {
  /** The page's scroll offset. Omit to keep the actions shown. */
  scrollY?: SharedValue<number>;
  /** How far down (px) the actions slide when hidden. */
  travel: number;
  /** Keeps the actions in view while true, e.g. while related details are open. */
  isForcedShown?: boolean;
}

/**
 * Floating actions that slide down out of the way on a scroll down and come
 * back on a scroll up. Uses the app's default motion. Returns the slide style
 * for an `Animated.View`, and whether the actions are hidden so callers can
 * drop touches and accessibility while they are out of view.
 */
export const useFloatingActionsScrollHide = ({
  scrollY,
  travel,
  isForcedShown = false,
}: UseFloatingActionsScrollHideOptions) => {
  const hiddenValue = useSharedValue(false);
  const anchorY = useSharedValue(0);
  const [isHidden, setIsHidden] = useState(false);

  useAnimatedReaction(
    () => scrollY?.value ?? 0,
    (y) => {
      const next = getFloatingActionsScrollState(
        y,
        anchorY.value,
        hiddenValue.value,
      );
      anchorY.set(next.anchorY);
      hiddenValue.set(next.isHidden);
    },
    [scrollY],
  );

  useEffect(() => {
    if (isForcedShown) {
      hiddenValue.set(false);
    }
  }, [hiddenValue, isForcedShown]);

  useAnimatedReaction(
    () => hiddenValue.value,
    (hidden, previous) => {
      if (hidden !== previous) {
        scheduleOnRN(setIsHidden, hidden);
      }
    },
  );

  const slideStyle = useAnimatedStyle(
    () => ({
      transform: [
        {
          translateY: withTiming(hiddenValue.value ? travel : 0, {
            duration: AnimationDuration.Fast,
            easing: Easing.out(Easing.cubic),
          }),
        },
      ],
    }),
    [travel],
  );

  return { slideStyle, isHidden };
};

export default useFloatingActionsScrollHide;
