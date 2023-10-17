/* eslint-disable import/prefer-default-export */

// External dependencies.
import { AnimationDuration } from '../../../../../constants/animation.constants';

// Defaults
/**
 * The animation duration used for initial render.
 */
export const DEFAULT_BOTTOMSHEETDIALOG_DISPLAY_DURATION =
  AnimationDuration.Regularly;
/**
 * This number represents the swipe speed to meet the velocity threshold.
 */
export const DEFAULT_BOTTOMSHEETDIALOG_SWIPETHRESHOLD_DURATION =
  AnimationDuration.Regularly;
/**
 * This indicates that 60% of the sheet needs to be offscreen to meet the distance threshold.
 */
export const DEFAULT_BOTTOMSHEETDIALOG_DISMISSTHRESHOLD = 0.6;
/**
 * Minimum spacing reserved for the overlay tappable area.
 */
export const DEFAULT_BOTTOMSHEETDIALOG_MARGINTOP = 250;
