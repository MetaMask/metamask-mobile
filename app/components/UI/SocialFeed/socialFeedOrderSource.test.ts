import { socialFeedSurfaceOrderSource } from './socialFeedOrderSource';

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
