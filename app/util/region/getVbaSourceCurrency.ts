import { isVbaRegionEnabled } from './isVbaRegionEnabled';

/**
 * Fiat codes a Virtual Bank Account autoramp can be created in. Each needs a
 * deposit screen and its own `moneyMovementNeobank<Currency>` flag.
 */
export type VbaSourceCurrency = 'BRL' | 'USD';

/** Supported currencies, in Choose Currency display order. */
export const VBA_SOURCE_CURRENCIES: readonly VbaSourceCurrency[] = [
  'BRL',
  'USD',
];

/** One open per-currency flag: the currency and the countries it serves. */
export interface VbaMarket {
  currency: VbaSourceCurrency;
  regions: readonly string[];
}

/**
 * Finds the open market whose `regions` include the location's country.
 *
 * @param markets - Open markets from `selectNeobankMarkets`.
 * @param location - Effective location, such as `BR` or `US-CA`.
 * @returns The market to create in, or undefined when none serves the country.
 */
export function getVbaMarketForCountry(
  markets: readonly VbaMarket[],
  location: string | undefined | null,
): VbaMarket | undefined {
  const trimmedLocation = location?.trim();
  return markets.find((market) =>
    isVbaRegionEnabled(trimmedLocation, market.regions),
  );
}

/**
 * Narrows an unknown value, such as a route param, to a supported fiat.
 *
 * @param value - Candidate fiat code.
 * @returns Whether the value is BRL or USD.
 */
export function isVbaSourceCurrency(
  value: unknown,
): value is VbaSourceCurrency {
  return VBA_SOURCE_CURRENCIES.includes(value as VbaSourceCurrency);
}
