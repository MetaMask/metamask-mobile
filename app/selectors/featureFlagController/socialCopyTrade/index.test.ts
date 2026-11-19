import {
  DEFAULT_SOCIAL_COPY_TRADE_GEO_BLOCKED_REGIONS,
  selectSocialCopyTradeGeoBlockedRegions,
} from '.';
import type { StateWithPartialEngine } from '../types';
import type { Json } from '@metamask/utils';

const buildState = (
  remoteFeatureFlags: Record<string, Json> = {},
): StateWithPartialEngine => ({
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags,
        cacheTimestamp: 0,
      },
    },
  },
});

describe('selectSocialCopyTradeGeoBlockedRegions', () => {
  it('returns the UK default when the flag is absent', () => {
    const result = selectSocialCopyTradeGeoBlockedRegions(buildState());

    expect(result).toEqual(['GB']);
  });

  it('returns the blocked regions from the remote flag', () => {
    const result = selectSocialCopyTradeGeoBlockedRegions(
      buildState({
        socialCopyTradeGeoBlockedCountries: { blockedRegions: ['US', 'CA-ON'] },
      }),
    );

    expect(result).toEqual(['US', 'CA-ON']);
  });

  it('returns an empty list when the remote flag blocks nothing', () => {
    const result = selectSocialCopyTradeGeoBlockedRegions(
      buildState({
        socialCopyTradeGeoBlockedCountries: { blockedRegions: [] },
      }),
    );

    expect(result).toEqual([]);
  });

  it('returns the UK default when blockedRegions is not an array', () => {
    const result = selectSocialCopyTradeGeoBlockedRegions(
      buildState({
        socialCopyTradeGeoBlockedCountries: { blockedRegions: 'US' },
      }),
    );

    expect(result).toEqual(DEFAULT_SOCIAL_COPY_TRADE_GEO_BLOCKED_REGIONS);
  });

  it('returns the UK default when blockedRegions contains a non-string', () => {
    const result = selectSocialCopyTradeGeoBlockedRegions(
      buildState({
        socialCopyTradeGeoBlockedCountries: { blockedRegions: ['US', 1] },
      }),
    );

    expect(result).toEqual(DEFAULT_SOCIAL_COPY_TRADE_GEO_BLOCKED_REGIONS);
  });

  it('returns the UK default when the flag is not an object', () => {
    const result = selectSocialCopyTradeGeoBlockedRegions(
      buildState({ socialCopyTradeGeoBlockedCountries: 'US' }),
    );

    expect(result).toEqual(DEFAULT_SOCIAL_COPY_TRADE_GEO_BLOCKED_REGIONS);
  });
});
