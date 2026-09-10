import { SOCIAL_V1_TAB_ORDER, SOCIAL_SHELL_TAB_CONFIG } from './tabConfig';

describe('SOCIAL_SHELL_TAB_CONFIG', () => {
  it('orders the Social Bundle tabs as Feed, Live trades, and Leaderboard', () => {
    expect(SOCIAL_V1_TAB_ORDER).toEqual(['feed', 'liveTrades', 'leaderboard']);
  });

  it.each([
    ['feed', 'trending'],
    ['liveTrades', 'memecoins'],
    ['leaderboard', 'topTraders'],
  ] as const)(
    'includes the default %s sub-navigation item',
    (tab, expected) => {
      const config = SOCIAL_SHELL_TAB_CONFIG[tab];

      const ids = config.subnav.map(({ id }) => id);

      expect(ids).toContain(expected);
      expect(config.defaultSubnav).toBe(expected);
    },
  );

  it('keeps user-visible labels as i18n keys', () => {
    const configs = Object.values(SOCIAL_SHELL_TAB_CONFIG);

    const labelKeys = configs.flatMap((config) => [
      config.labelKey,
      ...config.subnav.map(({ labelKey }) => labelKey),
    ]);

    expect(
      labelKeys.every((labelKey) => labelKey.startsWith('social_leaderboard.')),
    ).toBe(true);
  });
});
