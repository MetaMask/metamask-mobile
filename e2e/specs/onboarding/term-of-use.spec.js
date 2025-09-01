import TermsOfUseModal from '../../pages/Onboarding/TermsOfUseModal';
import TestHelpers from '../../helpers';
import OnboardingCarouselView from '../../pages/Onboarding/OnboardingCarouselView';
import OnboardingView from '../../pages/Onboarding/OnboardingView';
import Assertions from '../../framework/Assertions';
import { RegressionWalletUX } from '../../tags';

describe(RegressionWalletUX('Term of Use Modal'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.launchApp();
  });

  it('should displayed Term of Use when first launching app', async () => {
    await Assertions.expectElementToBeVisible(OnboardingCarouselView.container);
    await OnboardingCarouselView.tapOnGetStartedButton();

    await Assertions.expectElementToBeVisible(TermsOfUseModal.container);
  });

  it('should prevent attempts to bypass term of use', async () => {
    await TestHelpers.relaunchApp();
    await Assertions.expectElementToBeVisible(OnboardingCarouselView.container);
    await OnboardingCarouselView.tapOnGetStartedButton();

    await Assertions.expectElementToBeVisible(TermsOfUseModal.container);
  });

  it('should accept to term of use', async () => {
    await TermsOfUseModal.tapScrollEndButton();
    await TermsOfUseModal.tapAgreeCheckBox();
    await TermsOfUseModal.tapAcceptButton();
    await Assertions.expectElementToNotBeVisible(TermsOfUseModal.container);

    await Assertions.expectElementToBeVisible(OnboardingView.container);
  });

  it('should restart app after accepting terms', async () => {
    await TestHelpers.relaunchApp();
    await Assertions.expectElementToBeVisible(OnboardingCarouselView.container);
    await OnboardingCarouselView.tapOnGetStartedButton();

    await Assertions.expectElementToNotBeVisible(TermsOfUseModal.container);
    await Assertions.expectElementToBeVisible(OnboardingView.container);
  });
});
