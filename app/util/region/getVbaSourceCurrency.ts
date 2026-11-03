import { isVbaRegionEnabled } from './isVbaRegionEnabled';

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
 * Only the leading country segment is used, so `US-CA` reads as `US`. Callers
 * pass `regionOverride` from `moneyMovementNeobank` when the flag sets one,
 * otherwise the IP country. That country must be in `regions`; a country
 * outside the list creates nothing.
 * An explicit `regionCurrencies` entry wins. Otherwise `defaultCurrency` is
 * used. A missing mapping, a missing default, or a currency without a details
 * layout fails closed. An explicit currency that has no details layout does
 * not fall through to the default.
 *
 * @param location - Effective location, such as `BR` or `US-CA`.
 * @param regionCurrencies - Country-to-currency map from the remote flag.
 * @param regions - Enabled country codes from the remote flag.
 * @param defaultCurrency - Fiat for an enabled region with no explicit entry.
 * @returns The fiat to create, or undefined when nothing should be created.
 */
export function getVbaSourceCurrencyForCountry(
  location: string | undefined | null,
  regionCurrencies: Readonly<Record<string, VbaSourceCurrency>>,
  regions: readonly string[],
  defaultCurrency?: VbaSourceCurrency,
): VbaSourceCurrency | undefined {
  if (!location || !isVbaRegionEnabled(location, regions)) {
    return undefined;
  }
  const country = location.trim().toUpperCase().split('-')[0];
  const explicit = regionCurrencies[country];
  if (explicit) {
    return VBA_CURRENCIES_WITH_DEPOSIT_DETAILS.has(explicit)
      ? explicit
      : undefined;
  }
  if (
    !defaultCurrency ||
    !VBA_CURRENCIES_WITH_DEPOSIT_DETAILS.has(defaultCurrency)
  ) {
    return undefined;
  }
  return defaultCurrency;
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
