import type { TraderProfileResponse } from '@metamask/social-controllers';
import type { MySocialProfile } from '../hooks/useMyProfile';
import {
  FAKE_STATS_PREFIX,
  buildPerformanceCells,
  overlayMyProfileLiveStats,
} from './overlayMyProfileLiveStats';

const localProfile: MySocialProfile = {
  profileId: 'current-user',
  displayName: 'Giga Whale',
  handle: 'giga-whale',
  shareUrl: 'https://metamask.io/social/giga-whale',
  winRatePercent: 60,
  pnlUsd: 7100,
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
    expect(result.performanceCells).toEqual([]);
    expect(result.rankingTag).toBe('whale');
    expect(result.followerCount).toBe(4);
  });

  it('uses live stats without a fake prefix when the profile fetch succeeds', () => {
    const result = overlayMyProfileLiveStats(localProfile, liveProfile());

    expect(result.winRateLabel.startsWith(FAKE_STATS_PREFIX)).toBe(false);
    expect(result.pnlLabel.startsWith(FAKE_STATS_PREFIX)).toBe(false);
    expect(result.rankingTag).toBe('dolphin');
    expect(result.followerCount).toBe(88);
    expect(result.performanceCells.map((cell) => cell.id)).toEqual([
      'pnl',
      'winRate',
      'holdTime',
      'volume',
    ]);
  });

  it('keeps a fake prefix on headline stats the live profile omits', () => {
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
      }),
    );

    expect(result.winRateLabel.startsWith(FAKE_STATS_PREFIX)).toBe(true);
    expect(result.pnlLabel.startsWith(FAKE_STATS_PREFIX)).toBe(false);
    expect(result.performanceCells.map((cell) => cell.id)).toEqual(['pnl']);
  });
});

describe('buildPerformanceCells', () => {
  it('returns no cells without a live profile', () => {
    expect(buildPerformanceCells(null)).toEqual([]);
  });

  it('returns all four cells in grid order when live stats are present', () => {
    expect(buildPerformanceCells(liveProfile())).toEqual([
      { id: 'pnl', value: '+$1,200', tone: 'success' },
      { id: 'winRate', value: '42%', tone: 'default' },
      { id: 'holdTime', value: '3h', tone: 'default' },
      { id: 'volume', value: '$50,000', tone: 'default' },
    ]);
  });

  it('marks negative P&L with the error tone', () => {
    const [pnlCell] = buildPerformanceCells(
      liveProfile({ stats: { pnl30d: -450 } }),
    );

    expect(pnlCell).toEqual({ id: 'pnl', value: '-$450', tone: 'error' });
  });

  it('omits cells whose live value is missing', () => {
    const cells = buildPerformanceCells(
      liveProfile({
        stats: {
          pnl30d: null,
          winRate30d: 0.5,
          medianHoldMinutes: null,
          volumeUsd30d: 1000,
        },
      }),
    );

    expect(cells.map((cell) => cell.id)).toEqual(['winRate', 'volume']);
  });
});
