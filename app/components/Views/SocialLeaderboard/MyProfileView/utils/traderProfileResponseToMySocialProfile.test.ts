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
    });

    expect(result).toEqual({
      profileId: 'trader-1',
      displayName: 'alpha.eth',
      handle: 'alpha',
      bio: null,
      imageUrl: 'https://example.com/a.png',
      rankingTag: 'dolphin',
      xHandle: 'alpha',
      followerCount: 12,
      followingCount: 3,
      winRatePercent: 50,
      pnlUsd: 100,
      linkedAccountAddress: '0xabc',
      shareTradingActivity: null,
      joinedAt: null,
    });
  });

  it('keeps a list snapshot photo when the live profile has no image', () => {
    const result = traderProfileResponseToMySocialProfile(
      {
        ...live,
        profile: { ...live.profile, imageUrl: null },
      },
      { imageUrl: 'https://example.com/list.png' },
    );

    expect(result.imageUrl).toBe('https://example.com/list.png');
  });

  it('shows the Profile API display name, bio and creation date', () => {
    const profile = {
      ...live.profile,
      displayName: 'Alpha',
      bio: 'gm',
      createdAt: '2026-11-04T10:00:00.000Z',
    };

    const result = traderProfileResponseToMySocialProfile({ ...live, profile });

    expect(result).toMatchObject({
      displayName: 'Alpha',
      handle: 'alpha.eth',
      bio: 'gm',
      joinedAt: '2026-11-04T10:00:00.000Z',
    });
  });

  it.each([null, '', '   '])(
    'falls back to the username when the display name is %j',
    (displayName) => {
      const profile = { ...live.profile, displayName };

      const result = traderProfileResponseToMySocialProfile({
        ...live,
        profile,
      });

      expect(result.displayName).toBe('alpha.eth');
    },
  );

  it.each([
    ['public', true],
    ['private', false],
  ] as const)(
    'maps a %s trading privacy to shareTradingActivity %s',
    (tradingPrivacy, expected) => {
      const profile = { ...live.profile, tradingPrivacy };

      const result = traderProfileResponseToMySocialProfile({
        ...live,
        profile,
      });

      expect(result.shareTradingActivity).toBe(expected);
    },
  );

  it('leaves the bio empty when social-api sends an empty one', () => {
    const profile = { ...live.profile, bio: '' };

    const result = traderProfileResponseToMySocialProfile({ ...live, profile });

    expect(result.bio).toBeNull();
  });
});
