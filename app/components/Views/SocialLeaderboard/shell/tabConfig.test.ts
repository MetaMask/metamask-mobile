import { SOCIAL_V1_TAB_ORDER, SOCIAL_SHELL_TAB_CONFIG } from './tabConfig';

describe('SOCIAL_SHELL_TAB_CONFIG', () => {
  it('orders the Social V1 tabs as Trending, Following, Leaderboard, and Live trades', () => {
    expect(SOCIAL_V1_TAB_ORDER).toEqual([
      'trending',
      'following',
      'leaderboard',
      'liveTrades',
    ]);
  });

  it('keeps user-visible labels as i18n keys', () => {
    const labelKeys = Object.values(SOCIAL_SHELL_TAB_CONFIG).map(
      (config) => config.labelKey,
    );

    expect(
      labelKeys.every((labelKey) => labelKey.startsWith('social_leaderboard.')),
    ).toBe(true);
  });
});
