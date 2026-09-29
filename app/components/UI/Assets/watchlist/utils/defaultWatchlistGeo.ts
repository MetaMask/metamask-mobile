import {
  DEFAULT_WATCHLIST_BASE_ASSET_IDS,
  SPACEX_DEFAULT_ASSET_ID,
} from '../constants/defaultWatchlistTokens';

/** Countries where SpaceX must not appear in watchlist defaults (Slack / product). */
export const SPACEX_DEFAULT_GEO_BLOCKED_COUNTRIES = new Set([
  'US',
  'CA',
  'AF',
  'BY',
  'CU',
  'KP',
  'IR',
  'LY',
  'MM',
  'RU',
  'SO',
  'SS',
  'SD',
  'SY',
]);

/**
 * Sub-regions (Crimea, DNR, LNR, etc.) where SpaceX must not appear.
 * ISO 3166-2 codes; matched against the full geolocation string.
 */
export const SPACEX_DEFAULT_GEO_BLOCKED_REGIONS = new Set([
  'UA-43',
  'UA-14',
  'UA-09',
  'UA-65',
  'RU-43',
  'RU-92',
  'RU-09',
  'RU-23',
]);

/**
 * Returns whether SpaceX may be included in watchlist default suggestions.
 * Fail-closed: unknown or missing geo → not eligible.
 */
export const isSpaceXDefaultEligible = (
  location: string | undefined,
): boolean => {
  if (!location || location.toUpperCase() === 'UNKNOWN') {
    return false;
  }

  const upper = location.toUpperCase();
  const country = upper.split('-')[0];

  if (SPACEX_DEFAULT_GEO_BLOCKED_COUNTRIES.has(country)) {
    return false;
  }

  if (SPACEX_DEFAULT_GEO_BLOCKED_REGIONS.has(upper)) {
    return false;
  }

  return true;
};

/** Resolves the ordered default asset IDs for the empty-state CTA. */
export const getDefaultWatchlistAssetIds = (
  location: string | undefined,
): readonly string[] => {
  if (isSpaceXDefaultEligible(location)) {
    return [...DEFAULT_WATCHLIST_BASE_ASSET_IDS, SPACEX_DEFAULT_ASSET_ID];
  }
  return DEFAULT_WATCHLIST_BASE_ASSET_IDS;
};
