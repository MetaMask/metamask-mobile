import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';

export type VbaSourceCurrency = 'BRL' | 'USD' | 'EUR';

export const VBA_SOURCE_CURRENCIES: readonly VbaSourceCurrency[] = [
  'BRL',
  'USD',
  'EUR',
];

/** Currencies `VbaDetails` can show deposit details for. This PR only has PIX. */
const VBA_CURRENCIES_WITH_DEPOSIT_DETAILS: ReadonlySet<VbaSourceCurrency> =
  new Set(['BRL']);

/** Fiat for an IP country from `regionCurrencies`. Unmapped countries fail closed. */
export function getVbaSourceCurrencyForCountry(
  location: string | undefined | null,
  regionCurrencies: Readonly<Record<string, VbaSourceCurrency>>,
): VbaSourceCurrency | undefined {
  if (!location || location === UNKNOWN_LOCATION) {
    return undefined;
  }
  const country = location.trim().toUpperCase().split('-')[0];
  const currency = regionCurrencies[country];
  if (!currency) {
    return undefined;
  }
  return VBA_CURRENCIES_WITH_DEPOSIT_DETAILS.has(currency)
    ? currency
    : undefined;
}

export function isVbaSourceCurrency(
  value: unknown,
): value is VbaSourceCurrency {
  return VBA_SOURCE_CURRENCIES.includes(value as VbaSourceCurrency);
}
