import { AnimationDuration } from '@metamask/design-tokens';
import { FadeIn, FadeInDown } from 'react-native-reanimated';

/**
 * Step at which the footer actions enter. Screens that sequence their own
 * artwork after the template use {@link marketingMomentActionsEnteredAt}.
 */
export const MARKETING_MOMENT_ACTION_ENTER_STEP = 3;

/** Milliseconds until the footer actions have finished entering. */
export const marketingMomentActionsEnteredAt =
  MARKETING_MOMENT_ACTION_ENTER_STEP * AnimationDuration.Quickly +
  AnimationDuration.Slowly;

type EntranceAnimation = typeof FadeIn | typeof FadeInDown;

/**
 * Delayed fade used by the template slots.
 *
 * Returns nothing when Reduce Motion is on. The app root sets
 * `ReducedMotionConfig` to `ReduceMotion.Never`, which overwrites the flag
 * Reanimated's default `ReduceMotion.System` reads, so chaining that option
 * on `FadeIn` would still animate.
 */
export const marketingMomentEntrance = (
  animation: EntranceAnimation,
  step: number,
  reduceMotion: boolean,
) => {
  if (reduceMotion) {
    return undefined;
  }

  return animation
    .duration(AnimationDuration.Slowly)
    .delay(step * AnimationDuration.Quickly);
};

/**
 * Entrance for a slot that callers can replace. An explicit `entering`
 * value, including `undefined`, wins over the template default. Reduce
 * Motion still drops every entrance so a caller animation cannot opt back in.
 */
export const marketingMomentSlotEntering = <T>(
  reduceMotion: boolean,
  animatedProps: object | undefined,
  fallback: T,
): T | undefined => {
  if (reduceMotion) {
    return undefined;
  }

  if (
    animatedProps !== undefined &&
    Object.prototype.hasOwnProperty.call(animatedProps, 'entering')
  ) {
    return (animatedProps as { entering?: T }).entering;
  }

  return fallback;
};
