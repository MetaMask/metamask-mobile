import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

/**
 * Used when the remote flag is missing or malformed, so UK users stay hidden.
 */
export const DEFAULT_SOCIAL_COPY_TRADE_GEO_BLOCKED_REGIONS: readonly string[] =
  ['GB'];

/**
 * Country or country-region codes where Social Copy trade is hidden.
 *
 * LaunchDarkly key: `socialCopyTradeGeoBlockedCountries`
 * Value: `{ "blockedRegions": ["US", "CA-ON"] }`
 *
 * @returns Blocked codes, or the UK default when the flag is not a valid list.
 */
export const selectSocialCopyTradeGeoBlockedRegions = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): readonly string[] => {
    const remoteFlag =
      remoteFeatureFlags?.socialCopyTradeGeoBlockedCountries as unknown as
        | { blockedRegions?: unknown }
        | undefined;
    const blockedRegions = remoteFlag?.blockedRegions;

    if (
      Array.isArray(blockedRegions) &&
      blockedRegions.every((region) => typeof region === 'string')
    ) {
      return blockedRegions;
    }

    return DEFAULT_SOCIAL_COPY_TRADE_GEO_BLOCKED_REGIONS;
  },
);
