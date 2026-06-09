import { formatVolume } from '../../../Perps/utils/formatUtils';
import currencySymbols from '../../../../../util/currency-symbols.json';

/**
 * Replaces Perps' hardcoded `$` from {@link formatVolume} with the user's currency symbol
 * (or suffix when no symbol exists in the map).
 */
export function prefixVolumeWithCurrency(
  dollarFormatted: string,
  currencyCode: string,
): string {
  const code = currencyCode.toUpperCase();
  if (code === 'USD') {
    return dollarFormatted;
  }
  const symbol =
    currencySymbols[currencyCode.toLowerCase() as keyof typeof currencySymbols];

  if (dollarFormatted.startsWith('-$')) {
    const rest = dollarFormatted.slice(2);
    if (symbol) {
      return `-${symbol}${rest}`;
    }
    return `-${rest} ${code}`;
  }
  if (dollarFormatted.startsWith('$')) {
    const rest = dollarFormatted.slice(1);
    if (symbol) {
      return `${symbol}${rest}`;
    }
    return `${rest} ${code}`;
  }
  return dollarFormatted;
}

export function formatOhlcvVolumeDisplay(
  volume: string | number,
  currencyCode: string,
): string {
  return prefixVolumeWithCurrency(formatVolume(volume), currencyCode);
}
