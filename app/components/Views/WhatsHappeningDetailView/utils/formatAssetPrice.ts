import { TextColor } from '@metamask/design-system-react-native';
import { formatPerpsFiat } from '@metamask/perps-controller';

export interface FormattedAssetPrice {
  priceText: string;
  changeText: string | undefined;
  changeColor: TextColor;
}

/**
 * Returns the text and color for a 24h percentage change value.
 * Positive → success green, negative → error red, zero/undefined → muted.
 */
export function formatPercentageChange(change: number | undefined): {
  text: string | undefined;
  color: TextColor;
} {
  if (change === undefined || change === null || !Number.isFinite(change)) {
    return { text: undefined, color: TextColor.TextAlternative };
  }

  const sign = change >= 0 ? '+' : '';
  const text = `${sign}${change.toFixed(2)}%`;

  let color: TextColor = TextColor.TextAlternative;
  if (change > 0) {
    color = TextColor.SuccessDefault;
  } else if (change < 0) {
    color = TextColor.ErrorDefault;
  }

  return { text, color };
}

/**
 * Builds a `FormattedAssetPrice` display object for a token or perps asset.
 * `currency` is expected to be an ISO 4217 code (e.g. "USD", "EUR").
 * For perps, currency should always be "USD".
 */
export function formatAssetPrice(
  price: number | undefined,
  pricePercentChange: number | undefined,
  currency: string | undefined,
): FormattedAssetPrice {
  const priceText =
    price !== undefined && price !== null && Number.isFinite(price)
      ? formatPerpsFiat(price, {
          currency: currency ?? 'USD',
          stripTrailingZeros: false,
        })
      : '—';

  const { text: changeText, color: changeColor } =
    formatPercentageChange(pricePercentChange);

  return { priceText, changeText, changeColor };
}
