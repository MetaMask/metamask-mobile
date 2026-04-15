import type { CardProviderId } from './provider-types';

export type CountryProviderMap = Record<string, CardProviderId>;

/**
 * Returns the provider ID for a given country, or null if the country
 * is not supported by any provider.
 *
 * The map is provided by the caller — typically derived from a remote
 * feature flag via `deriveCountryProviderMap()`, or from a future
 * dedicated country→provider feature flag.
 */
export function getProviderForCountry(
  countryCode: string,
  map: CountryProviderMap,
): CardProviderId | null {
  return map[countryCode] ?? null;
}

export function getSupportedCountries(map: CountryProviderMap): string[] {
  return Object.keys(map);
}

/**
 * Derives a country→provider map from the existing `cardSupportedCountries`
 * feature flag (`Record<string, boolean>`).
 *
 * Today all supported countries map to a single provider. When a dedicated
 * country→provider feature flag exists, callers should use that directly
 * instead of this helper.
 */
export function deriveCountryProviderMap(
  supportedCountries: Record<string, boolean>,
  providerId: CardProviderId,
): CountryProviderMap {
  const map: CountryProviderMap = {};
  for (const [country, enabled] of Object.entries(supportedCountries)) {
    if (enabled) {
      map[country] = providerId;
    }
  }
  return map;
}
