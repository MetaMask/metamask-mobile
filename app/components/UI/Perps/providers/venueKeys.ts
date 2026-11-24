import type { PerpsProviderType } from '@metamask/perps-controller';

/**
 * Composite key for venue-scoped stream data (TAT-4407).
 *
 * Per-market channels key their caches and subscriber indexes by
 * `(providerId, symbol)` instead of `symbol`, so updates for the same symbol
 * from two venues no longer overwrite each other. In direct (single-venue)
 * mode updates carry no `providerId`, so the key degrades to the bare symbol
 * and behaviour and cache contents are the same as before multi-venue.
 */
export const buildVenueSymbolKey = (
  symbol: string,
  providerId?: PerpsProviderType,
): string => (providerId ? `${providerId}:${symbol}` : symbol);

/**
 * Split a composite key back into its venue and symbol.
 *
 * Only a known provider prefix is treated as a venue — market symbols can
 * contain colons themselves (e.g. Hyperliquid HIP-3's `xyz:TSLA`), so an
 * unprefixed key is the bare symbol on the active/default venue.
 */
export const parseVenueSymbolKey = (
  key: string,
): { symbol: string; providerId?: PerpsProviderType } => {
  if (key.startsWith('hyperliquid:') || key.startsWith('lighter:')) {
    const separatorIndex = key.indexOf(':');
    return {
      providerId: key.slice(0, separatorIndex) as PerpsProviderType,
      symbol: key.slice(separatorIndex + 1),
    };
  }
  return { symbol: key };
};

/**
 * Whether a streamed row belongs to the venue a subscriber asked for.
 *
 * An untagged update (direct mode or legacy cache) always matches — the only
 * live venue is the active one. A tagged update must come from the requested
 * venue or, when the subscriber names none, from the routing default venue,
 * so an untagged subscriber never takes the other exchange's tick for the same
 * symbol.
 */
export const venueMatchesSubscription = (
  requested: PerpsProviderType | undefined,
  actual: PerpsProviderType | undefined,
  defaultProvider: PerpsProviderType,
): boolean => !actual || (requested ?? defaultProvider) === actual;
