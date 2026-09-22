import {
  DESIGN_SYSTEM_LARGE_BREAKPOINT_WIDTH,
  getOswaldProfileTitleStyle,
  getOswaldSquadTitleStyle,
  oswaldHomeBalanceStyle,
  oswaldLinkCardHeadingStyle,
  oswaldMediumStyle,
  oswaldMoneyBalanceStyle,
  oswaldOnboardingTitleStyle,
  oswaldSemiBoldStyle,
  oswaldTokenPriceStyle,
} from './oswaldDisplay';

describe('oswaldDisplay', () => {
  it('uses named Oswald faces with a non-synthetic fontWeight', () => {
    expect(oswaldSemiBoldStyle.fontFamily).toBe('Oswald-SemiBold');
    expect(oswaldMediumStyle.fontFamily).toBe('Oswald-Medium');
  });

  it('sets fixed display sizes for balances, token price, and the link-card heading', () => {
    expect(oswaldHomeBalanceStyle).toMatchObject({
      fontSize: 44,
      lineHeight: 56,
    });
    expect(oswaldMoneyBalanceStyle).toMatchObject({
      fontSize: 44,
      lineHeight: 56,
    });
    expect(oswaldTokenPriceStyle).toMatchObject({
      fontSize: 40,
      lineHeight: 50,
    });
    expect(oswaldLinkCardHeadingStyle).toMatchObject({
      fontFamily: 'Oswald-Medium',
      fontSize: 28,
      lineHeight: 32,
    });
  });

  it('keeps onboarding headers at a fixed 32/40 SemiBold', () => {
    expect(oswaldOnboardingTitleStyle).toMatchObject({
      fontFamily: 'Oswald-SemiBold',
      fontSize: 32,
      lineHeight: 40,
    });
  });

  it('uses DisplayMd token sizes for profile titles', () => {
    expect(getOswaldProfileTitleStyle(false)).toMatchObject({
      fontSize: 32,
      lineHeight: 40,
    });
    expect(getOswaldProfileTitleStyle(true)).toMatchObject({
      fontSize: 48,
      lineHeight: 56,
    });
  });

  it('uses HeadingLg token sizes for squad titles', () => {
    expect(getOswaldSquadTitleStyle(false)).toMatchObject({
      fontSize: 24,
      lineHeight: 32,
    });
    expect(getOswaldSquadTitleStyle(true)).toMatchObject({
      fontSize: 32,
      lineHeight: 40,
    });
    expect(DESIGN_SYSTEM_LARGE_BREAKPOINT_WIDTH).toBe(768);
  });
});
