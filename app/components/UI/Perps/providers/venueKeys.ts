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
): string => (providerId ? `${providerId}\0${symbol}` : symbol);

/** The internal NUL separator cannot collide with a colon in a HIP-3 symbol. */
export const parseVenueSymbolKey = (
  key: string,
): { symbol: string; providerId?: PerpsProviderType } => {
  const separator = key.indexOf('\0');
  if (separator < 0) return { symbol: key };
  return {
    providerId: key.slice(0, separator) as PerpsProviderType,
    symbol: key.slice(separator + 1),
  };
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
