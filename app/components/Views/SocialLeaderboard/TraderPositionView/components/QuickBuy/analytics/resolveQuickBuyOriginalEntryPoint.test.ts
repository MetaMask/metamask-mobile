import {
  resolveQuickBuyOriginalEntryPointFromPositionSource,
  resolveQuickBuyOriginalEntryPointFromProfile,
} from './resolveQuickBuyOriginalEntryPoint';

describe('resolveQuickBuyOriginalEntryPointFromProfile', () => {
  it('maps leaderboard and home_carousel upstream profile sources', () => {
    expect(resolveQuickBuyOriginalEntryPointFromProfile('leaderboard')).toBe(
      'leaderboard',
    );
    expect(resolveQuickBuyOriginalEntryPointFromProfile('home_carousel')).toBe(
      'home_carousel',
    );
  });

  it('maps notification to notification', () => {
    expect(resolveQuickBuyOriginalEntryPointFromProfile('notification')).toBe(
      'notification',
    );
  });

  it('maps deep_link to trader_profile', () => {
    expect(resolveQuickBuyOriginalEntryPointFromProfile('deep_link')).toBe(
      'trader_profile',
    );
  });

  it('maps trader_feed to trader_feed', () => {
    expect(resolveQuickBuyOriginalEntryPointFromProfile('trader_feed')).toBe(
      'trader_feed',
    );
  });
});

describe('resolveQuickBuyOriginalEntryPointFromPositionSource', () => {
  it('maps known position route sources', () => {
    expect(
      resolveQuickBuyOriginalEntryPointFromPositionSource('leaderboard'),
    ).toBe('leaderboard');
    expect(
      resolveQuickBuyOriginalEntryPointFromPositionSource('notification'),
    ).toBe('notification');
    expect(
      resolveQuickBuyOriginalEntryPointFromPositionSource('deep_link'),
    ).toBe('deep_link');
    expect(
      resolveQuickBuyOriginalEntryPointFromPositionSource('home_carousel'),
    ).toBe('home_carousel');
    expect(
      resolveQuickBuyOriginalEntryPointFromPositionSource('profile_position'),
    ).toBe('trader_profile');
    expect(
      resolveQuickBuyOriginalEntryPointFromPositionSource('trader_feed'),
    ).toBe('trader_feed');
  });

  it('returns undefined for unknown sources', () => {
    expect(
      resolveQuickBuyOriginalEntryPointFromPositionSource('asset_details'),
    ).toBeUndefined();
  });
});
