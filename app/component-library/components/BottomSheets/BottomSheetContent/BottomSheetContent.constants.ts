/* eslint-disable import/prefer-default-export */

// External dependencies.
import { AnimationDuration } from '../../../constants/animation.constants';

// Defaults
/**
 * The animation duration used for initial render.
 */
export const DEFAULT_BOTTOMSHEETCONTENT_DISPLAY_DURATION =
  AnimationDuration.Regularly;
/**
 * The animation duration of the sheet after letting go of a swipe.
 */
export const DEFAULT_BOTTOMSHEETCONTENT_SWIPE_DURATION =
  AnimationDuration.Promptly;
/**
 * This number represents the swipe speed to meet the velocity threshold.
 */
export const DEFAULT_BOTTOMSHEETCONTENT_SWIPETHRESHOLD_DURATION =
  AnimationDuration.Regularly;
/**
 * This indicates that 60% of the sheet needs to be offscreen to meet the distance threshold.
 */
export const DEFAULT_BOTTOMSHEETCONTENT_DISMISSTHRESHOLD = 0.6;
/**
 * Minimum spacing reserved for the overlay tappable area.
 */
export const DEFAULT_BOTTOMSHEETCONTENT_MARGINTOP = 250;
