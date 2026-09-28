import {
  TAB_BAR_FLOATING_INSET_REDUCTION,
  TAB_BAR_FLOATING_MIN_BOTTOM_PADDING,
} from './TabBarFloating.constants';

/** Tightens iOS's home-indicator inset, floored because Android reports 0 on some emulators. */
export const getTabBarFloatingBottomPadding = (bottomInset: number): number =>
  Math.max(
    bottomInset - TAB_BAR_FLOATING_INSET_REDUCTION,
    TAB_BAR_FLOATING_MIN_BOTTOM_PADDING,
  );
