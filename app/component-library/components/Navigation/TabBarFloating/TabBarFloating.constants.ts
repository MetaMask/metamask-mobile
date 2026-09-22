import { IconName, IconSize } from '@metamask/design-system-react-native';
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
export const TAB_BAR_FLOATING_INSET_REDUCTION = 12;

/** Floor for the bottom gap, for devices reporting little or no bottom inset. */
export const TAB_BAR_FLOATING_MIN_BOTTOM_PADDING = 16;

/**
 * Clearance above Android's system navigation, added on top of its inset.
 * Three-button navigation fills its whole 48dp inset with an opaque bar, so
 * consuming the inset alone leaves the pill resting on it.
 */
export const TAB_BAR_FLOATING_SYSTEM_BAR_GAP = 16;

/** Matches Apple's iOS 26 tab bar; also the diameter of the search circle. */
export const TAB_BAR_FLOATING_HEIGHT = 62;

/** Gap between the pill and the search circle; matches UIKit's iOS 26 bar. */
export const TAB_BAR_FLOATING_GAP = 8;

/** Space between the bar and the screen edges; matches UIKit's iOS 26 bar. */
export const TAB_BAR_FLOATING_HORIZONTAL_INSET = 21;

/**
 * UIKit draws 28pt tab glyphs. `Xl` (32) is equally close but overruns the
 * 62pt bar once the label is stacked under it, so `Lg` is the usable match.
 */
export const TAB_BAR_FLOATING_ICON_SIZE = IconSize.Lg;

/** UIKit's iOS 26 label size; the smallest design-system variant (12/20) overruns the bar. */
export const TAB_BAR_FLOATING_LABEL_FONT_SIZE = 12;
export const TAB_BAR_FLOATING_LABEL_LINE_HEIGHT = 15;

/** Shared with the trade tray so every blurred surface reads as one material. */
export const TAB_BAR_FLOATING_BLUR_INTENSITY = 60;

/** Surface colour over the glass trade tray: 0 is pure glass, 1 is opaque. */
export const TRADE_TRAY_GLASS_FILL_OPACITY = 0.75;

/** Alpha of the hairline drawn around the glass tray. */
export const TRADE_TRAY_GLASS_BORDER_OPACITY = 0.5;

/** Corner radius of the glass tray, matching `rounded-3xl`. */
export const TRADE_TRAY_GLASS_RADIUS = 24;

export const TAB_BAR_FLOATING_TEST_IDS = {
  CONTAINER: 'tab-bar-floating-container',

  PILL: 'tab-bar-floating-pill',
  SEARCH_BUTTON: 'tab-bar-floating-search-button',
  TRADE_BUTTON: 'tab-bar-floating-trade-button',
} as const;
