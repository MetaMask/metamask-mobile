import type {
  Position,
  TraderProfileResponse,
} from '@metamask/social-controllers';
import { EM_DASH } from '../../../../UI/SocialFeed/utils/formatters';
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

const openPosition = (
  positionId: string,
  overrides: Partial<Position> = {},
): Position => ({
  positionId,
  tokenSymbol: positionId,
  tokenName: positionId,
  tokenAddress: `0x${positionId}`,
  chain: 'ethereum',
  positionAmount: 1,
  boughtUsd: 100,
  soldUsd: 0,
  realizedPnl: 0,
  costBasis: 100,
  trades: [],
  lastTradeAt: 1,
  ...overrides,
});

describe('overlayMyProfileLiveStats', () => {
  it('prefixes local mock stats when the live profile is missing', () => {
    const result = overlayMyProfileLiveStats(localProfile, null);

    expect(result.winRateLabel.startsWith(FAKE_STATS_PREFIX)).toBe(true);
    expect(result.pnlLabel).toBe(`${FAKE_STATS_PREFIX}+$7,100.00`);
    expect(result.performanceCells).toEqual([]);
    expect(result.rankingTag).toBe('whale');
    expect(result.followerCount).toBe(4);
  });

  it('uses live stats without a fake prefix when the profile fetch succeeds', () => {
    const result = overlayMyProfileLiveStats(localProfile, liveProfile());

    expect(result.winRateLabel.startsWith(FAKE_STATS_PREFIX)).toBe(false);
    expect(result.pnlLabel).toBe('+$1,200.00');
    expect(result.isPnlPositive).toBe(true);
    expect(result.rankingTag).toBe('dolphin');
    expect(result.followerCount).toBe(88);
    expect(result.performanceCells.map((cell) => cell.id)).toEqual([
      'pnl',
      'unrealizedPnl',
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
    expect(result.performanceCells.map((cell) => cell.id)).toEqual([
      'pnl',
      'unrealizedPnl',
      'winRate',
      'holdTime',
      'volume',
    ]);
    expect(result.performanceCells[2]).toEqual({
      id: 'winRate',
      value: EM_DASH,
      tone: 'default',
    });
    expect(result.performanceCells[3]).toEqual({
      id: 'holdTime',
      value: EM_DASH,
      tone: 'default',
    });
    expect(result.performanceCells[4]).toEqual({
      id: 'volume',
      value: EM_DASH,
      tone: 'default',
    });
  });

  it('keeps two decimal places on the compact header P&L', () => {
    const loss = overlayMyProfileLiveStats(
      localProfile,
      liveProfile({ stats: { pnl30d: -4 } }),
    );
    const cents = overlayMyProfileLiveStats(
      localProfile,
      liveProfile({ stats: { pnl30d: -6.38 } }),
    );

    expect(loss.pnlLabel).toBe('-$4.00');
    expect(loss.isPnlPositive).toBe(false);
    expect(cents.pnlLabel).toBe('-$6.38');
    expect(cents.isPnlPositive).toBe(false);
  });

  it('uses the non-negative tone when a live P&L loss rounds to zero cents', () => {
    const result = overlayMyProfileLiveStats(
      localProfile,
      liveProfile({ stats: { pnl30d: -0.004 } }),
    );

    expect(result.pnlLabel).toBe('$0.00');
    expect(result.isPnlPositive).toBe(true);
  });
});

describe('buildPerformanceCells', () => {
  it('returns no cells without a live profile', () => {
    expect(buildPerformanceCells(null)).toEqual([]);
  });

  it('returns every stat in grid order and shows $0.00 unrealized when nothing is priced', () => {
    expect(buildPerformanceCells(liveProfile())).toEqual([
      { id: 'pnl', value: '+$1,200.00', tone: 'success' },
      { id: 'unrealizedPnl', value: '$0.00', tone: 'default' },
      { id: 'winRate', value: '42%', tone: 'default' },
      { id: 'holdTime', value: '3h', tone: 'default' },
      { id: 'volume', value: '$50,000.00', tone: 'default' },
    ]);
  });

  it('fills unrealized from priced counted open positions', () => {
    const cells = buildPerformanceCells(liveProfile(), [
      openPosition('eth', { pnlValueUsd: 150, realizedPnl: 50 }),
      openPosition('insider', {
        flags: ['insider'],
        pnlValueUsd: 999,
        realizedPnl: 1,
      }),
    ]);

    expect(cells[1]).toEqual({
      id: 'unrealizedPnl',
      value: '+$100.00',
      tone: 'success',
    });
  });

  it('shows $0.00 unrealized when priced positions net to zero', () => {
    const cells = buildPerformanceCells(liveProfile(), [
      openPosition('flat', { pnlValueUsd: 10, realizedPnl: 10 }),
    ]);

    expect(cells[1]).toEqual({
      id: 'unrealizedPnl',
      value: '$0.00',
      tone: 'default',
    });
  });

  it('shows unsigned $0.00 unrealized when a loss rounds to zero cents', () => {
    const cells = buildPerformanceCells(liveProfile(), [
      openPosition('dust', { pnlValueUsd: 9.996, realizedPnl: 10 }),
    ]);

    expect(cells[1]).toEqual({
      id: 'unrealizedPnl',
      value: '$0.00',
      tone: 'default',
    });
  });

  it('keeps two decimal places on a sub-dollar unrealized loss', () => {
    const cells = buildPerformanceCells(liveProfile(), [
      openPosition('cents', { pnlValueUsd: 9.6, realizedPnl: 10 }),
    ]);

    expect(cells[1]).toEqual({
      id: 'unrealizedPnl',
      value: '-$0.40',
      tone: 'error',
    });
  });

  it('marks negative P&L with the error tone', () => {
    const [pnlCell] = buildPerformanceCells(
      liveProfile({ stats: { pnl30d: -450 } }),
    );

    expect(pnlCell).toEqual({ id: 'pnl', value: '-$450.00', tone: 'error' });
  });

  it('shows two decimal places for P&L and volume', () => {
    const cells = buildPerformanceCells(
      liveProfile({
        stats: {
          pnl30d: -6.38,
          winRate30d: null,
          medianHoldMinutes: null,
          volumeUsd30d: 319.2,
        },
      }),
    );

    expect(cells).toEqual([
      { id: 'pnl', value: '-$6.38', tone: 'error' },
      { id: 'unrealizedPnl', value: '$0.00', tone: 'default' },
      { id: 'winRate', value: EM_DASH, tone: 'default' },
      { id: 'holdTime', value: EM_DASH, tone: 'default' },
      { id: 'volume', value: '$319.20', tone: 'default' },
    ]);
  });

  it('shows a dash for unknown stats and zero for a real zero', () => {
    const cells = buildPerformanceCells(
      liveProfile({
        stats: {
          pnl30d: 0,
          winRate30d: null,
          medianHoldMinutes: 0,
          volumeUsd30d: null,
        },
      }),
      [openPosition('unpriced')],
    );

    expect(cells).toEqual([
      { id: 'pnl', value: '$0.00', tone: 'success' },
      { id: 'unrealizedPnl', value: EM_DASH, tone: 'default' },
      { id: 'winRate', value: EM_DASH, tone: 'default' },
      { id: 'holdTime', value: '0m', tone: 'default' },
      { id: 'volume', value: EM_DASH, tone: 'default' },
    ]);
  });

  it('keeps a known stat and uses a dash for the missing ones', () => {
    const cells = buildPerformanceCells(
      liveProfile({
        stats: {
          pnl30d: null,
          winRate30d: 0,
          medianHoldMinutes: null,
          volumeUsd30d: 1000,
        },
      }),
    );

    expect(cells).toEqual([
      { id: 'pnl', value: EM_DASH, tone: 'default' },
      { id: 'unrealizedPnl', value: '$0.00', tone: 'default' },
      { id: 'winRate', value: '0%', tone: 'default' },
      { id: 'holdTime', value: EM_DASH, tone: 'default' },
      { id: 'volume', value: '$1,000.00', tone: 'default' },
    ]);
  });
});
