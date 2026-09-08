import {
  Easing,
  FadeInDown,
  Keyframe,
  LinearTransition,
  ReduceMotion,
} from 'react-native-reanimated';

const DURATION = 220;
/**
 * Entry and exit are quicker than the reflow so an appended character reads as
 * an immediate response to the keypress rather than something fading in.
 */
const ENTER_DURATION = 130;
const EXIT_DURATION = 110;
const EASING = Easing.out(Easing.cubic);

/** Slide distance for a slot entering or leaving, in points. */
const SLOT_TRAVEL = 8;

/** Timing handed to Number Flow's own spin/transform/opacity animations. */
export const NUMERIC_SLOT_TIMING = {
  duration: DURATION,
  easing: EASING,
};

/**
 * Layout transition for the slots and the row itself, so appending a character
 * slides its neighbours aside instead of snapping them to the new position.
 *
 * Exported because siblings of an `AnimatedNumericText` (an input cursor, a
 * ticker) are re-laid out by the same width change and need the same curve to
 * move as one piece.
 */
export const NUMERIC_LAYOUT_TRANSITION = LinearTransition.duration(DURATION)
  .easing(EASING)
  .reduceMotion(ReduceMotion.System);

export const NUMERIC_SLOT_ENTERING = FadeInDown.duration(ENTER_DURATION)
  .easing(EASING)
  .withInitialValues({
    opacity: 0,
    transform: [{ translateY: SLOT_TRAVEL }],
  })
  .reduceMotion(ReduceMotion.System);

/**
 * A keyframe rather than `FadeOutDown`, whose travel distance is fixed at 25pt
 * and cannot be overridden, which would make a slot leave further than it
 * entered.
 */
export const NUMERIC_SLOT_EXITING = new Keyframe({
  0: {
    opacity: 1,
    transform: [{ translateY: 0 }],
  },
  100: {
    opacity: 0,
    transform: [{ translateY: SLOT_TRAVEL }],
    easing: EASING,
  },
})
  .duration(EXIT_DURATION)
  .reduceMotion(ReduceMotion.System);
