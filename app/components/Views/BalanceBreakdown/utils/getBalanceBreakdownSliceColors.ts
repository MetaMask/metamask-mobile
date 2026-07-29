import { AppThemeKey, type Theme } from '../../../../util/theme/models';
import type { SliceKey } from '../types';

/*
 * Fixed TMCU-1209 palettes from the approved light/dark reference artwork.
 * These intentionally do not use semantic colors because category identity
 * must stay identical between the allocation bar and its legend dots.
 */
/* eslint-disable @metamask/design-tokens/color-no-hex */
export const LIGHT_ALLOCATION_COLORS: Record<SliceKey, string> = {
  money: '#190066',
  tokens: '#89b0ff',
  perps: '#adb6fe',
  predict: '#c7ceff',
  defi: '#d6dbff',
};

export const DARK_ALLOCATION_COLORS: Record<SliceKey, string> = {
  money: '#8b99ff',
  tokens: '#cce7ff',
  perps: '#abbcce',
  predict: '#949596',
  defi: '#66676a',
};
/* eslint-enable @metamask/design-tokens/color-no-hex */

/** Blue-to-slate allocation palette shared by the bar and row indicators. */
export function getBalanceBreakdownSliceColors(
  themeAppearance: Theme['themeAppearance'],
): Record<SliceKey, string> {
  return themeAppearance === AppThemeKey.light
    ? LIGHT_ALLOCATION_COLORS
    : DARK_ALLOCATION_COLORS;
}
