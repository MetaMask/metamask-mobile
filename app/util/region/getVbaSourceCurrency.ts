import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';

/** Fiat codes a Virtual Bank Account autoramp can be created in. */
export type VbaSourceCurrency = 'BRL' | 'USD' | 'EUR';

export const VBA_SOURCE_CURRENCIES: readonly VbaSourceCurrency[] = [
  'BRL',
  'USD',
  'EUR',
];

const VBA_SOURCE_CURRENCY_BY_COUNTRY: Readonly<
  Record<string, VbaSourceCurrency>
> = {
  BR: 'BRL',
  US: 'USD',
};

/**
 * Currencies `VbaDetails` can show deposit details for. A mapped currency
 * outside this set falls back to BRL, so US users keep today's BRL autoramp
 * until the bank transfer details layout ships.
 */
const VBA_CURRENCIES_WITH_DEPOSIT_DETAILS: ReadonlySet<VbaSourceCurrency> =
  new Set(['BRL']);

/**
 * Picks the autoramp fiat from a GeolocationController location.
 *
 * Only the leading country segment is used, so `US-CA` reads as `US`. EUR is
 * never picked from a country; it is only reachable from Choose Currency.
 *
 * @param location - Raw GeolocationController location, such as `BR` or `US-CA`.
 * @returns The fiat to create, or undefined when the country has no mapping.
 */
export function getVbaSourceCurrencyForCountry(
  location: string | undefined | null,
): VbaSourceCurrency | undefined {
  if (!location || location === UNKNOWN_LOCATION) {
    return undefined;
  }
  const country = location.trim().toUpperCase().split('-')[0];
  const currency = VBA_SOURCE_CURRENCY_BY_COUNTRY[country];
  if (!currency) {
    return undefined;
  }
  return VBA_CURRENCIES_WITH_DEPOSIT_DETAILS.has(currency) ? currency : 'BRL';
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
