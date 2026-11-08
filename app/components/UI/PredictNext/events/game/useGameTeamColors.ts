import { useMemo } from 'react';
import { useTheme } from '../../../../../util/theme';
import type { PredictGame } from '../../types';
import type { GameSelection } from './createGamePresentation';

/**
 * Lowest contrast a Team color may have against the card background (WCAG
 * 2.x non-text and large-text minimum). Below it the price drawn in that color
 * is hard to read, so the theme color is used instead.
 */
export const MIN_TEAM_COLOR_CONTRAST = 3;

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/iu;

const channel = (value: number) => {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance of a `#RGB` or `#RRGGBB[AA]` color, or undefined. */
const relativeLuminance = (color: string): number | undefined => {
  const match = HEX_COLOR.exec(color);
  if (!match) {
    return undefined;
  }
  const hex =
    match[1].length === 3
      ? match[1]
          .split('')
          .map((digit) => digit + digit)
          .join('')
      : match[1];
  const [red, green, blue] = [0, 2, 4].map((start) =>
    channel(parseInt(hex.slice(start, start + 2), 16)),
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

/**
 * WCAG contrast ratio between two colors, or undefined when either one is not
 * a hex color.
 */
export const getContrastRatio = (
  foreground: string,
  background: string,
): number | undefined => {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  if (first === undefined || second === undefined) {
    return undefined;
  }
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * The Team color when it reads on the background, otherwise the fallback.
 * A color whose contrast cannot be measured is kept as the Venue sent it.
 */
const readableTeamColor = (
  teamColor: string | undefined,
  background: string,
  fallback: string,
): string => {
  if (!teamColor) {
    return fallback;
  }
  const ratio = getContrastRatio(teamColor, background);
  return ratio !== undefined && ratio < MIN_TEAM_COLOR_CONTRAST
    ? fallback
    : teamColor;
};

/**
 * Each Team's color: its own primary color, or the theme's info (away) and
 * success (home) colors when the Venue sends none, there is no Game, or the
 * Team color has less than 3:1 contrast against the card background in the
 * current theme (for example the Ravens' dark purple in dark mode).
 */
export const useGameTeamColors = (
  game: PredictGame | undefined,
): Record<GameSelection, string> => {
  const { colors } = useTheme();
  return useMemo(
    () => ({
      away: readableTeamColor(
        game?.awayTeam.primaryColor,
        colors.background.section,
        colors.info.default,
      ),
      home: readableTeamColor(
        game?.homeTeam.primaryColor,
        colors.background.section,
        colors.success.default,
      ),
    }),
    [
      colors.background.section,
      colors.info.default,
      colors.success.default,
      game?.awayTeam.primaryColor,
      game?.homeTeam.primaryColor,
    ],
  );
};
