import { Platform } from 'react-native';

import {
  TAB_BAR_FLOATING_INSET_REDUCTION,
  TAB_BAR_FLOATING_MIN_BOTTOM_PADDING,
  TAB_BAR_FLOATING_SYSTEM_BAR_GAP,
} from './TabBarFloating.constants';

/**
 * Distance the bar floats above the bottom of the screen, floored because some
 * devices report no inset at all.
 *
 * iOS tightens the home-indicator inset, which reserves more room than the
 * indicator itself needs. Android draws edge to edge, so its inset is the
 * system navigation and the bar clears it rather than trimming into it.
 */
export const getTabBarFloatingBottomPadding = (bottomInset: number): number =>
  Math.max(
    Platform.OS === 'android'
      ? bottomInset + TAB_BAR_FLOATING_SYSTEM_BAR_GAP
      : bottomInset - TAB_BAR_FLOATING_INSET_REDUCTION,
    TAB_BAR_FLOATING_MIN_BOTTOM_PADDING,
  );
