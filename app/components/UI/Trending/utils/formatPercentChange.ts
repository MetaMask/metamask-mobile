import { TextColor } from '@metamask/design-system-react-native';

interface PercentChangeResult {
  changeLabel: string | undefined;
  changeTextColor: TextColor;
}

/**
 * Formats a raw percent-change value into a display label and semantic color.
 * Returns `undefined` label for null / undefined / NaN inputs.
 */
export function formatPercentChange(
  raw: number | string | null | undefined,
): PercentChangeResult {
  const n =
    raw !== undefined && raw !== null && raw !== ''
      ? parseFloat(String(raw))
      : NaN;

  if (Number.isNaN(n)) {
    return {
      changeLabel: undefined,
      changeTextColor: TextColor.TextAlternative,
    };
  }

  if (n === 0) {
    return {
      changeLabel: '0.00%',
      changeTextColor: TextColor.TextAlternative,
    };
  }

  return {
    changeLabel: `${n > 0 ? '+' : ''}${n.toFixed(2)}%`,
    changeTextColor: n > 0 ? TextColor.SuccessDefault : TextColor.ErrorDefault,
  };
}
