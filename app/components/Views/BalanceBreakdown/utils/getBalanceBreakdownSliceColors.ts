import type { Colors } from '../../../../util/theme/models';
import type { SliceKey } from '../types';

/**
 * Donut / legend stroke colors from the active {@link Colors} (light or dark).
 */
export function getBalanceBreakdownSliceColors(
  themeColors: Colors,
): Record<SliceKey, string> {
  const { accent01, accent02, accent03, accent04 } = themeColors;
  return {
    tokens: accent01.normal,
    perps: accent02.normal,
    predict: accent03.normal,
    defi: accent04.normal,
  };
}
