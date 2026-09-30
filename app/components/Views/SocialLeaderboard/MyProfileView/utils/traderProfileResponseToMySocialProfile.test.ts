import type { TraderProfileResponse } from '@metamask/social-controllers';
import { traderProfileResponseToMySocialProfile } from './traderProfileResponseToMySocialProfile';

const live: TraderProfileResponse = {
  profile: {
    profileId: 'trader-1',
    address: '0xabc',
    allAddresses: ['0xabc'],
    name: 'alpha.eth',
    imageUrl: 'https://example.com/a.png',
  },
  stats: {
    pnl30d: 100,
    winRate30d: 0.5,
    volumeUsd30d: 200,
    tradeCount30d: 9,
  },
  perChainBreakdown: {
    perChainPnl: {},
    perChainRoi: {},
    perChainVolume: {},
  },
  socialHandles: { twitter: 'alpha' },
  followerCount: 12,
  followingCount: 3,
  copytradedAllTime: { count: 4, volumeUSD: 0, distinctActors: 1 },
  rankingTag: 'dolphin',
};

describe('traderProfileResponseToMySocialProfile', () => {
  it('maps live trader profile fields onto the V1 profile shape', () => {
    const result = traderProfileResponseToMySocialProfile(live, {
      handle: 'alpha',
      shareUrl: 'https://example.com/p',
    });

    expect(result).toEqual({
      profileId: 'trader-1',
      displayName: 'alpha.eth',
      handle: 'alpha',
      imageUrl: 'https://example.com/a.png',
      rankingTag: 'dolphin',
      xHandle: 'alpha',
      followerCount: 12,
      followingCount: 3,
      shareUrl: 'https://example.com/p',
      winRatePercent: 50,
      pnlUsd: 100,
      timesCopied: 4,
      volumeUsd30d: 200,
      tradeCount30d: 9,
      linkedAccountAddress: '0xabc',
    });
  });
});
