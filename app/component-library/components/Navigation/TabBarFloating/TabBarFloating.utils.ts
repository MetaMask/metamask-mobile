import { Platform } from 'react-native';

import {
  TAB_BAR_FLOATING_INSET_REDUCTION,
  TAB_BAR_FLOATING_MIN_BOTTOM_PADDING,
  TAB_BAR_FLOATING_OPAQUE_NAV_BAR_INSET,
  TAB_BAR_FLOATING_SYSTEM_BAR_GAP,
} from './TabBarFloating.constants';

/**
 * Distance the bar floats above the bottom of the screen, floored because some
 * devices report no inset at all.
 *
 * iOS tightens the home-indicator inset, which reserves more room than the
 * indicator itself needs. Android draws edge to edge, so the inset is the
 * system navigation: a gesture strip is mostly empty and already reads as
 * clearance, while a three-button bar fills its inset and needs a gap above it.
 */
export const getTabBarFloatingBottomPadding = (bottomInset: number): number => {
  if (Platform.OS !== 'android') {
    return Math.max(
      bottomInset - TAB_BAR_FLOATING_INSET_REDUCTION,
      TAB_BAR_FLOATING_MIN_BOTTOM_PADDING,
    );
  }

  const systemBarGap =
    bottomInset >= TAB_BAR_FLOATING_OPAQUE_NAV_BAR_INSET
      ? TAB_BAR_FLOATING_SYSTEM_BAR_GAP
      : 0;

  return Math.max(
    bottomInset + systemBarGap,
    TAB_BAR_FLOATING_MIN_BOTTOM_PADDING,
  );
};
