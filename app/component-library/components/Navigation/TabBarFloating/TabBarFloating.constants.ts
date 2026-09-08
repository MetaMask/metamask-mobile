import { IconName } from '@metamask/design-system-react-native';
import { TabBarIconKey } from '../TabBar/TabBar.types';

/**
 * Design-system icons for the floating bar, per state.
 *
 * Kept separate from `ICON_BY_TAB_BAR_ICON_KEY` because that map is built on
 * the deprecated `component-library` icon set, which has no people glyph for
 * the Social tab.
 */
export const FLOATING_ICON_BY_TAB_BAR_ICON_KEY: Partial<
  Record<TabBarIconKey, IconName>
> = {
  [TabBarIconKey.Wallet]: IconName.Home,
  [TabBarIconKey.Browser]: IconName.Explore,
  [TabBarIconKey.Trending]: IconName.TrendUp,
  [TabBarIconKey.Activity]: IconName.Activity,
  [TabBarIconKey.Money]: IconName.Musd,
  [TabBarIconKey.Rewards]: IconName.MetamaskFoxOutline,
  [TabBarIconKey.Social]: IconName.People,
  [TabBarIconKey.Trade]: IconName.Add,
  [TabBarIconKey.Actions]: IconName.SwapVertical,
  [TabBarIconKey.Setting]: IconName.Setting,
};

/** Selected-state icons. Keys with no filled variant fall back to the outline. */
export const FLOATING_FILLED_ICON_BY_TAB_BAR_ICON_KEY: Partial<
  Record<TabBarIconKey, IconName>
> = {
  [TabBarIconKey.Wallet]: IconName.HomeFilled,
  [TabBarIconKey.Activity]: IconName.ClockFilled,
  [TabBarIconKey.Money]: IconName.MusdFilled,
};

/** Trimmed off the bottom safe-area inset so the pill sits closer to the edge. */
export const TAB_BAR_FLOATING_INSET_REDUCTION = 10;

/** Floor for the bottom gap, for devices reporting little or no bottom inset. */
export const TAB_BAR_FLOATING_MIN_BOTTOM_PADDING = 16;

/*
 * Proportions below are measured from Apple's iOS 26 Photos tab bar, which
 * publishes no numbers. Apple fits two tabs at ~95pt in a 62pt bar; the
 * treatment fits four at ~72pt, so matching Apple's height would leave each tab
 * close to square. The height is scaled to hold the per-tab aspect instead.
 */

/** Height of the pill, and the diameter of the search circle beside it. */
export const TAB_BAR_FLOATING_HEIGHT = 52;

/** Gap between the pill and the search circle. */
export const TAB_BAR_FLOATING_GAP = 14;

/** Vertical padding inside a tab item, and the icon-to-label gap. */
export const TAB_BAR_FLOATING_ITEM_PADDING = 4;

/**
 * Label type ramp. Set explicitly because the smallest design-system body
 * variant is 12/20, whose line height alone would overrun a 52pt bar.
 */
export const TAB_BAR_FLOATING_LABEL_FONT_SIZE = 10;
export const TAB_BAR_FLOATING_LABEL_LINE_HEIGHT = 12;

/** Strength of the system material used below iOS 26. */
export const TAB_BAR_FLOATING_BLUR_INTENSITY = 60;

export const TAB_BAR_FLOATING_TEST_IDS = {
  CONTAINER: 'tab-bar-floating-container',

  PILL: 'tab-bar-floating-pill',
  SEARCH_BUTTON: 'tab-bar-floating-search-button',
} as const;
