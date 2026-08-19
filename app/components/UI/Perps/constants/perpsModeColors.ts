/* eslint-disable @metamask/design-tokens/color-no-hex */
/**
 * Perps Pro golds. The accent is not part of the shared design-token palette,
 * so these values are hardcoded from Figma:
 *
 * - chooser sheet: node 11623-26935
 * - header switch pill: nodes 11623-26982 (Lite) and 11623-27029 (Pro)
 */

const GOLD_DEEP = '#946500';
const GOLD_BRIGHT = '#CF8D00';
const GOLD_PALE = '#DDC598';

/** Pro switch pill border. */
export const PERPS_PRO_GOLD = GOLD_BRIGHT;

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
export const PERPS_PRO_ICON_TILE_LIGHT = '#CF8D0029';

/** `GOLD_PALE` at 12% — chooser icon tile, dark theme. */
export const PERPS_PRO_ICON_TILE_DARK = '#DDC5981F';

export const getPerpsProChooserIconColors = (isDark: boolean) => ({
  candlestick: isDark
    ? PERPS_PRO_CANDLESTICK_DARK
    : PERPS_PRO_CANDLESTICK_LIGHT,
  tile: isDark ? PERPS_PRO_ICON_TILE_DARK : PERPS_PRO_ICON_TILE_LIGHT,
});
