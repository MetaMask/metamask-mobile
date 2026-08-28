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

export const TAB_BAR_FLOATING_TEST_IDS = {
  CONTAINER: 'tab-bar-floating-container',
  SCRIM: 'tab-bar-floating-scrim',
  HIGHLIGHT: 'tab-bar-floating-highlight',
  PILL: 'tab-bar-floating-pill',
  SEARCH_BUTTON: 'tab-bar-floating-search-button',
} as const;
