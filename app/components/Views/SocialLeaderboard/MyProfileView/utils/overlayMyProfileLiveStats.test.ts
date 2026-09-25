import type { TraderProfileResponse } from '@metamask/social-controllers';
import type { MySocialProfile } from '../hooks/useMyProfile';
import {
  FAKE_STATS_PREFIX,
  overlayMyProfileLiveStats,
} from './overlayMyProfileLiveStats';

const localProfile: MySocialProfile = {
  profileId: 'current-user',
  displayName: 'Giga Whale',
  handle: 'giga-whale',
  shareUrl: 'https://metamask.io/social/giga-whale',
  winRatePercent: 60,
  pnlUsd: 7100,
  holdTimeLabel: '4d',
  timesCopied: 981,
  followerCount: 4,
  rankingTag: 'whale',
};

const liveProfile = (
  overrides: Partial<TraderProfileResponse> = {},
): TraderProfileResponse => ({
  profile: {
    profileId: 'live-id',
    address: '0xabc',
    allAddresses: ['0xabc'],
    name: 'Onchain Name',
    imageUrl: null,
  },
  stats: {
    pnl30d: 1200,
    winRate30d: 0.42,
    medianHoldMinutes: 180,
    tradeCount30d: 12,
    volumeUsd30d: 50000,
  },
  perChainBreakdown: {
    perChainPnl: {},
    perChainRoi: {},
    perChainVolume: {},
  },
  socialHandles: {},
  followerCount: 88,
  followingCount: 3,
  copytradedAllTime: {
    count: 44,
    volumeUSD: 1000,
    distinctActors: 2,
  },
  rankingTag: 'dolphin',
  ...overrides,
});

describe('overlayMyProfileLiveStats', () => {
  it('prefixes local mock stats when the live profile is missing', () => {
    const result = overlayMyProfileLiveStats(localProfile, null);

    expect(result.winRateLabel.startsWith(FAKE_STATS_PREFIX)).toBe(true);
    expect(result.pnlLabel.startsWith(FAKE_STATS_PREFIX)).toBe(true);
    expect(result.holdTimeLabel.startsWith(FAKE_STATS_PREFIX)).toBe(true);
    expect(result.timesCopiedLabel.startsWith(FAKE_STATS_PREFIX)).toBe(true);
    expect(result.fallbackFields.winRate).toBe(true);
    expect(result.rankingTag).toBe('whale');
    expect(result.followerCount).toBe(4);
    expect(result.sheetProfile.profile.name).toBe('Giga Whale');
  });

  it('uses live stats without a fake prefix when the profile fetch succeeds', () => {
    const result = overlayMyProfileLiveStats(localProfile, liveProfile());

    expect(result.winRateLabel.startsWith(FAKE_STATS_PREFIX)).toBe(false);
    expect(result.pnlLabel.startsWith(FAKE_STATS_PREFIX)).toBe(false);
    expect(result.fallbackFields.winRate).toBe(false);
    expect(result.fallbackFields.pnl).toBe(false);
    expect(result.rankingTag).toBe('dolphin');
    expect(result.followerCount).toBe(88);
    expect(result.sheetProfile.profile.name).toBe('Giga Whale');
    expect(result.sheetProfile.stats.pnl30d).toBe(1200);
    expect(result.sheetProfile.copytradedAllTime?.count).toBe(44);
  });

  it('keeps a fake prefix on fields the live profile omits', () => {
    const result = overlayMyProfileLiveStats(
      localProfile,
      liveProfile({
        stats: {
          pnl30d: 1200,
          winRate30d: null,
          medianHoldMinutes: null,
          tradeCount30d: null,
          volumeUsd30d: null,
        },
        copytradedAllTime: {
          count: 0,
          volumeUSD: 0,
          distinctActors: 0,
        },
      }),
    );

    expect(result.fallbackFields.winRate).toBe(true);
    expect(result.winRateLabel.startsWith(FAKE_STATS_PREFIX)).toBe(true);
    expect(result.fallbackFields.pnl).toBe(false);
    expect(result.timesCopiedLabel.startsWith(FAKE_STATS_PREFIX)).toBe(false);
  });
});
