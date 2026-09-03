import { IconName } from '@metamask/design-system-react-native';
import type { GlassStyle } from 'expo-glass-effect';
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

/**
 * Distance at which the pill and the search button start to merge, matching the
 * gap between them so they blend only as they approach each other.
 */
export const TAB_BAR_FLOATING_GLASS_SPACING = 12;

/**
 * The highlight's two edges spring at different rates, and the gap between them
 * is the stretch. The leading edge (the one heading for the destination) runs at
 * a higher natural frequency than the trailing edge, so mid-flight the bubble is
 * wider than a slot and reads as pulled across rather than teleported.
 *
 * Both are damped enough to settle without a visible wobble; the leading edge
 * keeps a little overshoot on purpose. Tune by feel on a device — jest cannot
 * observe these mid-flight.
 *
 * Kept quick (~200ms to rest) on purpose: while the springs run, the highlight
 * commits to the shadow tree every frame, and on Fabric that competes with the
 * commit that mounts the destination screen. The shorter the slide, the sooner
 * navigation stops fighting it.
 */
export const HIGHLIGHT_LEADING_SPRING = {
  damping: 30,
  stiffness: 520,
  mass: 0.8,
};

export const HIGHLIGHT_TRAILING_SPRING = {
  damping: 28,
  stiffness: 300,
  mass: 0.9,
};

/** Absolute `scaleX` cap, so a long hop can't smear the bubble across the pill. */
export const HIGHLIGHT_MAX_STRETCH = 1.35;

/**
 * How far the bubble grows on both axes while lifted, as a fraction of rest
 * size. Large enough to visibly overflow the pill, like the system tab bar.
 */
export const HIGHLIGHT_LIFT_SCALE = 0.3;

/** Rising under the finger: quick, with a little overshoot for liveliness. */
export const HIGHLIGHT_LIFT_SPRING = {
  damping: 18,
  stiffness: 420,
  mass: 1,
};

/** Settling onto the destination: no overshoot, so the landing reads as final. */
export const HIGHLIGHT_LAND_SPRING = {
  damping: 26,
  stiffness: 300,
  mass: 0.8,
};

/**
 * Summed distance (px) of both edges from their targets below which the slide
 * counts as landed and the bubble drops back to rest.
 */
export const HIGHLIGHT_LANDING_THRESHOLD = 1;

/** Fill left under the bubble while lifted, so a clear bubble still has body. */
export const HIGHLIGHT_LIFT_FILL_OPACITY = 0.35;

/**
 * How much the icon and label under the bubble grow at full lift, as a
 * fraction. This is the magnification — the bubble itself bends nothing.
 */
export const HIGHLIGHT_LIFT_ICON_SCALE = 0.12;

/**
 * Optional tint on the lifted glass disc. Off by default because tint dampens
 * refraction, but a low-alpha white can help the disc read in dark mode.
 */
export const HIGHLIGHT_GLASS_TINT: string | undefined =
  'rgba(255,255,255,0.15)';

/**
 * Native material of the lifted disc, drawn above the icons. `none` draws no
 * native disc at all: the lifted look is then the in-pill fill and rim, which
 * is clear and bends nothing under it. `clear` is a lens that magnifies the
 * icon; `regular` is frosted. Tint dampens either.
 */
export const HIGHLIGHT_GLASS_STYLE: GlassStyle = 'none';

/**
 * Sequence the slide before navigation: the bubble lifts on the press as
 * always, but the destination is only navigated to once the bubble has landed.
 * The screen's focus work then starts after the animation instead of under
 * it, where it competes with the animation for the main thread and starves
 * it. Cost: the screen arrives about a slide later than it does now.
 */
export const HIGHLIGHT_NAVIGATE_AFTER_SLIDE = true;

/**
 * Navigation fires no later than this after a press, whether or not a landing
 * was ever detected — unmeasured slots, an interrupted slide, anything odd.
 * Above the slowest landing on purpose, so it is a safety net and not the
 * normal path.
 */
export const HIGHLIGHT_NAVIGATE_FALLBACK_MS = 500;

export const TAB_BAR_FLOATING_TEST_IDS = {
  CONTAINER: 'tab-bar-floating-container',
  HIGHLIGHT: 'tab-bar-floating-highlight',
  HIGHLIGHT_GLASS: 'tab-bar-floating-highlight-glass',
  PILL: 'tab-bar-floating-pill',
  SEARCH_BUTTON: 'tab-bar-floating-search-button',
} as const;
