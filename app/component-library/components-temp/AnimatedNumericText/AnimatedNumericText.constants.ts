import {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  ReduceMotion,
} from 'react-native-reanimated';

const DURATION = 270;
/**
 * Entry and exit are quicker than the reflow so an appended character reads as
 * an immediate response to the keypress rather than something fading in.
 */
const ENTER_DURATION = 150;
const EXIT_DURATION = 130;
const EASING = Easing.out(Easing.cubic);

/** Duration shared by Laminar and the surrounding layout transition. */
export const NUMERIC_ANIMATION_DURATION = DURATION;

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

export const NUMERIC_SLOT_ENTERING = FadeIn.duration(ENTER_DURATION)
  .easing(EASING)
  .reduceMotion(ReduceMotion.System);

export const NUMERIC_SLOT_EXITING = FadeOut.duration(EXIT_DURATION)
  .easing(EASING)
  .reduceMotion(ReduceMotion.System);
