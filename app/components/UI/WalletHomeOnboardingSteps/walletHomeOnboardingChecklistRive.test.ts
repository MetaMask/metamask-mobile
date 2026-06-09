import {
  WALLET_HOME_ONBOARDING_CHECKLIST_SLIDE_DOWN_EXIT_MIN_PX,
  WALLET_HOME_ONBOARDING_CHECKLIST_SLIDE_DOWN_EXIT_WINDOW_HEIGHT_RATIO,
  walletHomeOnboardingChecklistSlideDownExitDistancePx,
} from './walletHomeOnboardingChecklistRive';

describe('walletHomeOnboardingChecklistSlideDownExitDistancePx', () => {
  it('uses the minimum px when ratio * height is smaller', () => {
    const shortWindowHeight = 400;
    const ratioProduct =
      shortWindowHeight *
      WALLET_HOME_ONBOARDING_CHECKLIST_SLIDE_DOWN_EXIT_WINDOW_HEIGHT_RATIO;
    expect(ratioProduct).toBeLessThan(
      WALLET_HOME_ONBOARDING_CHECKLIST_SLIDE_DOWN_EXIT_MIN_PX,
    );
    expect(
      walletHomeOnboardingChecklistSlideDownExitDistancePx(shortWindowHeight),
    ).toBe(WALLET_HOME_ONBOARDING_CHECKLIST_SLIDE_DOWN_EXIT_MIN_PX);
  });

  it('uses ratio * height when that exceeds the minimum', () => {
    const tallWindowHeight = 1200;
    const expected =
      tallWindowHeight *
      WALLET_HOME_ONBOARDING_CHECKLIST_SLIDE_DOWN_EXIT_WINDOW_HEIGHT_RATIO;
    expect(expected).toBeGreaterThanOrEqual(
      WALLET_HOME_ONBOARDING_CHECKLIST_SLIDE_DOWN_EXIT_MIN_PX,
    );
    expect(
      walletHomeOnboardingChecklistSlideDownExitDistancePx(tallWindowHeight),
    ).toBe(expected);
  });
});
