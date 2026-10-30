import type { TraderProfileResponse } from '@metamask/social-controllers';
import {
  ALL_CHAINS,
  PERP_CHAINS,
  SPOT_CHAINS,
} from '../../../Views/shared/top-traders-constants';
import {
  buildOffPageViewerTrader,
  type OffPageViewerIdentity,
} from './buildOffPageViewerTrader';

const identity: OffPageViewerIdentity = {
  profileId: 'viewer',
  displayName: 'Wen',
  handle: 'wen',
  linkedAccountAddress: '0xlinked',
};

const liveProfile = (
  overrides: Partial<TraderProfileResponse> = {},
): TraderProfileResponse => ({
  profile: {
    profileId: 'viewer',
    address: '0xabc',
    allAddresses: ['0xabc'],
    name: 'live-name',
    imageUrl: 'foxicon://agent/background1',
  },
  stats: {
    pnl7d: 12,
    pnl30d: 40,
    roiPercent7d: 4.2,
    roiPercent30d: 9.1,
    winRate7d: 0.5,
  },
  perChainBreakdown: {
    perChainPnl: {},
    perChainRoi: {},
    perChainVolume: {},
  },
  socialHandles: {},
  followerCount: 7,
  followingCount: 1,
  copytradedAllTime: { count: 0, volumeUSD: 0, distinctActors: 0 },
  ...overrides,
});

describe('buildOffPageViewerTrader', () => {
  it('sums 7d pnl over the requested chains', () => {
    const result = buildOffPageViewerTrader({
      identity,
      live: liveProfile({
        perChainBreakdown: {
          perChainPnl: {},
          perChainRoi: {},
          perChainVolume: {},
          perChainPnl7d: { base: 10, ethereum: -3, hyperliquid: 100 },
        },
      }),
      sort: 'pnl',
      timeframe: '7d',
      chains: SPOT_CHAINS,
    });

    expect(result.trader.pnlValue).toBe(7);
    expect(result.trader.followerCount).toBe(7);
    expect(result.trader.winRatePercent).toBe(50);
    expect(result.omitPercentage).toBe(false);
    expect(result.trader.percentageChange).toBe(4.2);
  });

  it('uses the per-chain roi when one chain is requested', () => {
    const result = buildOffPageViewerTrader({
      identity,
      live: liveProfile({
        perChainBreakdown: {
          perChainPnl: { hyperliquid: 20 },
          perChainRoi: {},
          perChainVolume: {},
          perChainPnl7d: { hyperliquid: 20 },
          perChainRoi7d: { hyperliquid: 12.5 },
        },
      }),
      sort: 'pnl',
      timeframe: '7d',
      chains: PERP_CHAINS,
    });

    expect(result.trader.pnlValue).toBe(20);
    expect(result.trader.percentageChange).toBe(12.5);
  });

  it('does not use global roi when a requested chain has no roi', () => {
    const result = buildOffPageViewerTrader({
      identity,
      live: liveProfile({
        stats: { pnl7d: 20, roiPercent7d: 9.1 },
        perChainBreakdown: {
          perChainPnl: {},
          perChainRoi: {},
          perChainVolume: {},
          perChainPnl7d: { hyperliquid: 20 },
          perChainRoi7d: {},
        },
      }),
      sort: 'pnl',
      timeframe: '7d',
      chains: PERP_CHAINS,
    });

    expect(result.trader.pnlValue).toBe(20);
    expect(result.trader.percentageChange).toBe(0);
    expect(result.omitPercentage).toBe(true);
  });

  it('uses the global roi when several chains are requested', () => {
    const result = buildOffPageViewerTrader({
      identity,
      live: liveProfile({
        perChainBreakdown: {
          perChainPnl: {},
          perChainRoi: { base: 80 },
          perChainVolume: {},
          perChainRoi7d: { base: 80 },
        },
      }),
      sort: 'roi',
      timeframe: '7d',
      chains: ALL_CHAINS,
    });

    expect(result.trader.percentageChange).toBe(4.2);
    expect(result.trader.displayMetric.label).toContain('4.2');
  });

  it('reads the 30d window', () => {
    const result = buildOffPageViewerTrader({
      identity,
      live: liveProfile({
        perChainBreakdown: {
          perChainPnl: { base: 15, solana: 5 },
          perChainRoi: {},
          perChainVolume: {},
        },
      }),
      sort: 'pnl',
      timeframe: '30d',
      chains: SPOT_CHAINS,
    });

    expect(result.trader.pnlValue).toBe(20);
    expect(result.trader.percentageChange).toBe(9.1);
    expect(result.trader.pnl30d).toBe(20);
  });

  it('falls back to the global pnl when the breakdown is empty', () => {
    const result = buildOffPageViewerTrader({
      identity,
      live: liveProfile(),
      sort: 'pnl',
      timeframe: '7d',
      chains: ALL_CHAINS,
    });

    expect(result.trader.pnlValue).toBe(12);
  });

  it('keeps a zero when the breakdown omits the requested chains', () => {
    const result = buildOffPageViewerTrader({
      identity,
      live: liveProfile({
        stats: { pnl7d: 12 },
        perChainBreakdown: {
          perChainPnl: {},
          perChainRoi: {},
          perChainVolume: {},
          perChainPnl7d: { ethereum: 12 },
        },
      }),
      sort: 'pnl',
      timeframe: '7d',
      chains: PERP_CHAINS,
    });

    expect(result.trader.pnlValue).toBe(0);
  });

  it('marks the card empty when the window has no pnl', () => {
    const result = buildOffPageViewerTrader({
      identity,
      live: liveProfile({
        stats: {},
        perChainBreakdown: {
          perChainPnl: {},
          perChainRoi: {},
          perChainVolume: {},
        },
      }),
      sort: 'pnl',
      timeframe: '7d',
      chains: ALL_CHAINS,
    });

    expect(result.omitPercentage).toBe(false);
    expect(result.trader.pnlValue).toBe(0);
  });

  it('hides the percent when pnl exists and roi does not', () => {
    const result = buildOffPageViewerTrader({
      identity,
      live: liveProfile({
        stats: { pnl7d: -0.59 },
      }),
      sort: 'pnl',
      timeframe: '7d',
      chains: ALL_CHAINS,
    });

    expect(result.omitPercentage).toBe(true);
    expect(result.trader.pnlValue).toBe(-0.59);
  });

  it('uses the live fox url', () => {
    const result = buildOffPageViewerTrader({
      identity: {
        ...identity,
        avatarPresetId: 'zombie',
        avatarBackgroundId: 'background7',
      },
      live: liveProfile(),
      sort: 'pnl',
      timeframe: '7d',
      chains: ALL_CHAINS,
    });

    expect(result.trader.avatarUri).toBe('foxicon://agent/background1');
    expect(result.trader.username).toBe('Wen');
    expect(result.trader.address).toBe('0xabc');
  });

  it('rebuilds a foxicon url from the local preset when the live image is missing', () => {
    const result = buildOffPageViewerTrader({
      identity: {
        ...identity,
        displayName: '',
        avatarPresetId: 'zombie',
        avatarBackgroundId: 'background7',
      },
      live: liveProfile({
        profile: {
          profileId: 'viewer',
          address: '',
          allAddresses: [],
          name: 'live-name',
          imageUrl: null,
        },
      }),
      sort: 'pnl',
      timeframe: '7d',
      chains: ALL_CHAINS,
    });

    expect(result.trader.avatarUri).toBe('foxicon://zombie/background7');
    expect(result.trader.username).toBe('wen');
    expect(result.trader.address).toBe('0xlinked');
  });
});
