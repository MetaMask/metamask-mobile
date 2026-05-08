import { TextColor } from '@metamask/design-system-react-native';

export interface FormattedAssetPrice {
  priceText: string;
  changeText: string | undefined;
  changeColor: TextColor;
}

/**
 * Formats a fiat price for display. Mirrors the logic used in `PopularTokenRow`
 * and `TokenListItem` — fixed 2 decimal places with currency symbol.
 */
export function formatPrice(
  price: number,
  currency: string | undefined,
): string {
  const safeCurrency = currency?.toUpperCase() || 'USD';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${safeCurrency} ${price.toFixed(2)}`;
  }
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
      ? formatPrice(price, currency)
      : '—';

  const { text: changeText, color: changeColor } =
    formatPercentageChange(pricePercentChange);

  return { priceText, changeText, changeColor };
}
