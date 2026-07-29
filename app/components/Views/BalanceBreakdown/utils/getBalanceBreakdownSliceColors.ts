import { brandColor } from '@metamask/design-tokens';
import type { Colors } from '../../../../util/theme/models';
import type { SliceKey } from '../types';

/** Blue-to-slate allocation palette shared by the bar and row indicators. */
export function getBalanceBreakdownSliceColors(
  themeColors: Colors,
): Record<SliceKey, string> {
  return {
    money: brandColor.blue300,
    tokens: themeColors.accent04.light,
    perps: brandColor.grey200,
    predict: brandColor.grey300,
    defi: brandColor.grey500,
  };
}
