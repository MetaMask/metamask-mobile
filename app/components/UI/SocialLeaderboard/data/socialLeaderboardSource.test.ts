import {
  ALL_CHAINS,
  PERP_CHAINS,
  SPOT_CHAINS,
} from '../../../Views/shared/top-traders-constants';
import {
  getLeaderboardAssetClass,
  resolveSocialLeaderboardSource,
  type SocialLeaderboardSource,
} from './socialLeaderboardSource';

const PERPS_ON = { isPerpsEnabled: true };
const PERPS_OFF = { isPerpsEnabled: false };

describe('resolveSocialLeaderboardSource', () => {
  it.each([
    [undefined, ALL_CHAINS],
    ['all', ALL_CHAINS],
    ['tokens', SPOT_CHAINS],
    ['perps', PERP_CHAINS],
  ] as const)(
    'maps the %s asset class to its chain set',
    (assetClass, chains) => {
      expect(
        resolveSocialLeaderboardSource({ kind: 'all', assetClass }, PERPS_ON),
      ).toStrictEqual({ status: 'ready', chains });
    },
  );

  it('falls back to spot chains for the combined ranking when perps are off', () => {
    expect(
      resolveSocialLeaderboardSource({ kind: 'all' }, PERPS_OFF),
    ).toStrictEqual({ status: 'ready', chains: SPOT_CHAINS });
  });

  it.each([
    { kind: 'all', assetClass: 'perps' },
    { kind: 'perp', symbol: 'BTC' },
  ] as SocialLeaderboardSource[])(
    'hides a perps source when perps are off: %o',
    (source) => {
      expect(resolveSocialLeaderboardSource(source, PERPS_OFF)).toStrictEqual({
        status: 'hidden',
      });
    },
  );

  it.each([
    { kind: 'token', assetId: 'eip155:1/erc20:0xabc' },
    { kind: 'perp', symbol: 'BTC' },
  ] as SocialLeaderboardSource[])(
    'reports a single-asset source as unavailable: %o',
    (source) => {
      expect(resolveSocialLeaderboardSource(source, PERPS_ON)).toStrictEqual({
        status: 'unavailable',
      });
    },
  );
});

describe('getLeaderboardAssetClass', () => {
  it.each([
    [{ kind: 'all' }, 'all'],
    [{ kind: 'all', assetClass: 'tokens' }, 'tokens'],
    [{ kind: 'token', assetId: 'eip155:1/erc20:0xabc' }, 'tokens'],
    [{ kind: 'perp', symbol: 'BTC' }, 'perps'],
  ] as [SocialLeaderboardSource, string][])(
    'reports %o as %s',
    (source, assetClass) => {
      expect(getLeaderboardAssetClass(source)).toBe(assetClass);
    },
  );
});
