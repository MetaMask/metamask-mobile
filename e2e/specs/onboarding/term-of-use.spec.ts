import TermsOfUseModal from '../../pages/Onboarding/TermsOfUseModal';
import TestHelpers from '../../helpers';
import OnboardingCarouselView from '../../pages/Onboarding/OnboardingCarouselView';
import OnboardingView from '../../pages/Onboarding/OnboardingView';
import Assertions from '../../framework/Assertions.ts';
import { Regression } from '../../tags';

describe(Regression('Term of Use Modal'), () => {
  beforeAll(async (): Promise<void> => {
    jest.setTimeout(150000);
    await TestHelpers.launchApp();
  });

  it('should display Term of Use when first launching app', async (): Promise<void> => {
    await Assertions.expectElementToBeVisible(OnboardingCarouselView.container, {
      description: 'Onboarding Carousel View should be visible',
    });
    await OnboardingCarouselView.tapOnGetStartedButton();

    await Assertions.expectElementToBeVisible(TermsOfUseModal.container, {
      description: 'Terms of Use Modal should be visible',
    });
  });

  it('should prevent attempts to bypass term of use', async (): Promise<void> => {
    await TestHelpers.relaunchApp();
    await Assertions.expectElementToBeVisible(OnboardingCarouselView.container, {
      description: 'Onboarding Carousel View should be visible',
    });
    await OnboardingCarouselView.tapOnGetStartedButton();

    await Assertions.expectElementToBeVisible(TermsOfUseModal.container, {
      description: 'Terms of Use Modal should be visible',
    });
  });

  it('should accept terms of use and proceed to onboarding', async (): Promise<void> => {
    await TermsOfUseModal.tapScrollEndButton();
    await TermsOfUseModal.tapAgreeCheckBox();
    await TermsOfUseModal.tapAcceptButton();
    await Assertions.expectElementToNotBeVisible(TermsOfUseModal.container, {
      description: 'Terms of Use Modal should not be visible after acceptance',
    });

    await Assertions.expectElementToBeVisible(OnboardingView.container, {
      description: 'Onboarding View should be visible after accepting terms',
    });
  });

  it('should restart app after accepting terms', async (): Promise<void> => {
    await TestHelpers.relaunchApp();
    await Assertions.expectElementToBeVisible(OnboardingCarouselView.container, {
      description: 'Onboarding Carousel View should be visible',
    });
    await OnboardingCarouselView.tapOnGetStartedButton();

    await Assertions.expectElementToNotBeVisible(TermsOfUseModal.container, {
      description: 'Terms of Use Modal should not be visible',
    });
    await Assertions.expectElementToBeVisible(OnboardingView.container, {
      description: 'Onboarding View should be visible directly after accepting terms previously',
    });
  });
}); 