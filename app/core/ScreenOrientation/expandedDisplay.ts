import { Dimensions, Platform } from 'react-native';

/**
 * Shortest window side, in points, that distinguishes the iPhone Duo inner
 * display from a phone or the Duo cover screen.
 *
 * The inner display measures 951 by 669 points, so its shorter side stays 669
 * in both orientations. The cover screen is about 466 points wide, and current
 * iPhones stay under that. 580 sits in the gap.
 */
export const EXPANDED_DISPLAY_MIN_SHORT_SIDE = 580;

export function isExpandedDisplaySize(width: number, height: number): boolean {
  return Math.min(width, height) >= EXPANDED_DISPLAY_MIN_SHORT_SIDE;
}

/** True when this iOS window is the unfolded iPhone Duo canvas. */
export function isExpandedDisplay(): boolean {
  if (Platform.OS !== 'ios') {
    return false;
  }

  const { width, height } = Dimensions.get('window');
  return isExpandedDisplaySize(width, height);
}
