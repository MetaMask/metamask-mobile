import {
  socialFeedSurfaceAnalyticsSource,
  socialFeedSurfaceOrderSource,
} from './socialFeedOrderSource';

describe('socialFeedSurfaceOrderSource', () => {
  it.each([
    ['social_trending', 'social_trending'],
    ['social_following', 'social_following'],
    ['social_live', 'social_live_trades'],
  ] as const)('maps %s to %s', (location, source) => {
    expect(socialFeedSurfaceOrderSource(location)).toBe(source);
  });

  it.each([undefined, 'social_leaderboard', 'perps_home', 'my_profile'])(
    'omits a source for %s',
    (location) => {
      expect(socialFeedSurfaceOrderSource(location)).toBeUndefined();
    },
  );
});

describe('socialFeedSurfaceAnalyticsSource', () => {
  it.each([
    ['social_live', 'social_live_trades'],
    ['my_profile', 'trader_profile'],
    ['trader_profile', 'trader_profile'],
    ['token_details', 'asset_details'],
    ['perps_home', 'perps_home'],
    ['perps_market_details', 'perp_asset_screen'],
  ] as const)('maps %s to %s', (location, source) => {
    expect(socialFeedSurfaceAnalyticsSource(location)).toBe(source);
  });

  it('omits a source for an unknown surface', () => {
    expect(socialFeedSurfaceAnalyticsSource(undefined)).toBeUndefined();
  });
});
