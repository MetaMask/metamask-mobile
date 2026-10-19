import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';

/** Fiat codes a Virtual Bank Account autoramp can be created in. */
export type VbaSourceCurrency = 'BRL' | 'USD' | 'EUR';

export const VBA_SOURCE_CURRENCIES: readonly VbaSourceCurrency[] = [
  'BRL',
  'USD',
  'EUR',
];

/**
 * Currencies `VbaDetails` can show deposit details for. Choose Currency only
 * offers these. EUR stays out until that layout exists.
 */
const VBA_CURRENCIES_WITH_DEPOSIT_DETAILS: ReadonlySet<VbaSourceCurrency> =
  new Set(['BRL', 'USD']);

/** Currencies the Choose Currency screen lists, in display order. */
export const VBA_CHOOSABLE_SOURCE_CURRENCIES: readonly VbaSourceCurrency[] =
  VBA_SOURCE_CURRENCIES.filter((currency) =>
    VBA_CURRENCIES_WITH_DEPOSIT_DETAILS.has(currency),
  );

/**
 * Picks the autoramp fiat from a GeolocationController location.
 *
 * Only the leading country segment is used, so `US-CA` reads as `US`. The map
 * comes from `moneyMovementNeobank.regionCurrencies`. A missing country or a
 * currency without a details layout fails closed.
 *
 * @param location - Raw GeolocationController location, such as `BR` or `US-CA`.
 * @param regionCurrencies - Country-to-currency map from the remote flag.
 * @returns The fiat to create, or undefined when the country has no mapping.
 */
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

/**
 * Narrows an unknown value, such as a route param, to a supported fiat.
 *
 * @param value - Candidate fiat code.
 * @returns Whether the value is BRL, USD, or EUR.
 */
export function isVbaSourceCurrency(
  value: unknown,
): value is VbaSourceCurrency {
  return VBA_SOURCE_CURRENCIES.includes(value as VbaSourceCurrency);
}
