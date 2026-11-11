import { colors } from '../../../../styles/common';

const GOLD_DEEP = colors.perpsProGoldDeep;
const GOLD_BRIGHT = colors.perpsProGoldBright;
const GOLD_PALE = colors.perpsProGoldPale;

/** Bright gold stop shared by the Pro pill. */
export const PERPS_PRO_GOLD = GOLD_BRIGHT;

/**
 * Pro outline ramp, matching the glass sheen: a highlight at the top-center
 * that deepens toward the bottom-left.
 */
export const PRO_PILL_BORDER_GRADIENT_START = { x: 0.5, y: 0 };
export const PRO_PILL_BORDER_GRADIENT_END = { x: 0, y: 1 };
export const PRO_PILL_BORDER_GRADIENT_LOCATIONS = [0, 0.5, 1] as const;

/**
 * Switch pill gradient stops as `[darker, lighter]`. Dark theme shifts the pair
 * one step up the ramp so both stops stay legible on a dark surface.
 */
const PILL_GRADIENT_STOPS = {
  light: [GOLD_DEEP, GOLD_BRIGHT],
  dark: [GOLD_BRIGHT, GOLD_PALE],
} as const;

const pillGradientStops = (isDark: boolean) =>
  isDark ? PILL_GRADIENT_STOPS.dark : PILL_GRADIENT_STOPS.light;

/**
 * Pro label fill — both stops at full opacity, alternating so the sweep reads
 * as a moving sheen rather than a flat fill.
 */
export const getPerpsProPillGradientColors = (isDark: boolean) => {
  const [darker, lighter] = pillGradientStops(isDark);
  return [darker, lighter, darker, lighter, darker];
};

/**
 * Pro outline. The lighter gold holds across the top highlight and falls off
 * to the deeper gold, the same direction as the glass sheen.
 */
export const getPerpsProPillBorderGradientColors = (isDark: boolean) => {
  const [darker, lighter] = pillGradientStops(isDark);
  return [lighter, lighter, darker];
};

/** Mode-switch sweep, fading in and out of the pill edges. */
export const getPerpsProPillShimmerColors = (isDark: boolean) => {
  const [darker, lighter] = pillGradientStops(isDark);
  return ['transparent', darker, lighter, 'transparent'];
};

/** Filled candlestick on the Lite/Pro chooser — light theme. */
export const PERPS_PRO_CANDLESTICK_LIGHT = GOLD_DEEP;

/** Filled candlestick on the Lite/Pro chooser — dark theme. */
export const PERPS_PRO_CANDLESTICK_DARK = GOLD_PALE;

/** `GOLD_BRIGHT` at 16% — chooser icon tile, light theme. */
export const PERPS_PRO_ICON_TILE_LIGHT = `${GOLD_BRIGHT}29`;

/** `GOLD_PALE` at 12% — chooser icon tile, dark theme. */
export const PERPS_PRO_ICON_TILE_DARK = `${GOLD_PALE}1F`;

export const getPerpsProChooserIconColors = (isDark: boolean) => ({
  candlestick: isDark
    ? PERPS_PRO_CANDLESTICK_DARK
    : PERPS_PRO_CANDLESTICK_LIGHT,
  tile: isDark ? PERPS_PRO_ICON_TILE_DARK : PERPS_PRO_ICON_TILE_LIGHT,
});
