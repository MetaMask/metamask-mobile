/* eslint-disable @metamask/design-tokens/color-no-hex -- Decorative podium medal chrome; no DS tokens for multi-stop metallic gradients. */
/**
 * Metallic palette for the top-rank decorations.
 *
 * Each medal exposes a bright `rankDigit` color for legible rank numerals on
 * dark backgrounds and a multi-stop chrome gradient used by the avatar ring.
 */

export interface MedalColors {
  /**
   * High-luminance tint for the rank numeral on dark backgrounds. Kept separate
   * from the chrome `gradient` palette so the digit stays as legible and vivid
   * as default body text (ranks 4+), which muted metallics alone do not achieve.
   */
  rankDigit: string;
  /**
   * Multi-stop chrome gradient (dark rim → bright peak → mid → deep → bright
   * peak → mid → dark rim). The alternating peaks fake the polished-metal
   * look of a real coin/medal rim. Must contain at least 3 stops.
   */
  gradient: readonly string[];
  /**
   * Stop positions (0–1) for `gradient`. Length must equal `gradient.length`.
   */
  gradientLocations: readonly number[];
}

// Stop positions shared by all chrome palettes. Two narrow bright peaks at
// ~15% and ~65% create the alternating highlight/shadow bands that give the
// ring its specular "shiny" appearance.
const CHROME_LOCATIONS: readonly number[] = [0, 0.15, 0.3, 0.5, 0.65, 0.85, 1];

const GOLD: MedalColors = {
  rankDigit: '#FFEE58',
  gradient: [
    '#5C4400',
    '#FFF8DC',
    '#FFC400',
    '#8B6508',
    '#FFE066',
    '#D4AF37',
    '#3D2C00',
  ],
  gradientLocations: CHROME_LOCATIONS,
};

const SILVER: MedalColors = {
  rankDigit: '#ECEFF1',
  gradient: [
    '#2A2A2A',
    '#FFFFFF',
    '#D8D8D8',
    '#5A5A5A',
    '#F0F0F0',
    '#A0A0A0',
    '#1F1F1F',
  ],
  gradientLocations: CHROME_LOCATIONS,
};

const BRONZE: MedalColors = {
  rankDigit: '#FFAB40',
  gradient: [
    '#3D2410',
    '#FFD7A8',
    '#CD7F32',
    '#5C3712',
    '#F4A460',
    '#A0612A',
    '#2D1A08',
  ],
  gradientLocations: CHROME_LOCATIONS,
};

/** Whether `rank` is a podium position (1, 2 or 3). */
export const isTopRank = (rank: number): boolean => rank >= 1 && rank <= 3;

/**
 * Returns the metallic color set for a given rank, or `null` if the rank is
 * not a podium position (rank > 3).
 */
export const getMedalColors = (rank: number): MedalColors | null => {
  switch (rank) {
    case 1:
      return GOLD;
    case 2:
      return SILVER;
    case 3:
      return BRONZE;
    default:
      return null;
  }
};

/**
 * Medal emoji that floats above each podium avatar. The same glyph family
 * (gold / silver / bronze medal) is used for all three ranks so they share
 * a consistent visual footprint.
 */
export const PODIUM_EMOJI: Readonly<Record<1 | 2 | 3, string>> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

/**
 * Subtle shadow under podium rank numerals for contrast on varied backgrounds.
 */
export const PODIUM_RANK_TEXT_SHADOW_COLOR = 'rgba(0, 0, 0, 0.35)';

/** Style fragment shared by all podium rank digits (shadow only; color from medal). */
const PODIUM_RANK_TEXT_SHADOW_STYLE = {
  textShadowColor: PODIUM_RANK_TEXT_SHADOW_COLOR,
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
} as const;

/**
 * Combined podium rank numeral style for a medal `rankDigit` color.
 */
export const getPodiumRankIndicatorStyle = (rankDigit: string) => ({
  color: rankDigit,
  ...PODIUM_RANK_TEXT_SHADOW_STYLE,
});
