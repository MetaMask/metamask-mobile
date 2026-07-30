import { brandColor } from '@metamask/design-tokens';
import { AppThemeKey, type Theme } from '../../../../util/theme/models';
import type { SliceKey } from '../types';

/*
 * TMCU-1209 palettes matched to the nearest static brand color tokens.
 * Category identity stays identical between the allocation bar and its dots.
 */
export const LIGHT_ALLOCATION_COLORS: Record<SliceKey, string> = {
  money: brandColor.blue600,
  tokens: brandColor.blue500,
  perps: brandColor.blue300,
  predict: brandColor.indigo300,
  defi: brandColor.blue100,
};

export const DARK_ALLOCATION_COLORS: Record<SliceKey, string> = {
  money: brandColor.blue300,
  tokens: brandColor.indigo100,
  perps: brandColor.grey200,
  predict: brandColor.grey400,
  defi: brandColor.grey500,
};

/** Blue-to-slate allocation palette shared by the bar and row indicators. */
export function getBalanceBreakdownSliceColors(
  themeAppearance: Theme['themeAppearance'],
): Record<SliceKey, string> {
  return themeAppearance === AppThemeKey.light
    ? LIGHT_ALLOCATION_COLORS
    : DARK_ALLOCATION_COLORS;
}
