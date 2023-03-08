import TermsOfUseModal from '../pages/Onboarding/TermsOfUseModal';
import TestHelpers from '../helpers';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';

describe('Term of service', () => {
  beforeEach(() => {
    jest.setTimeout(200000);
  });

  it('should displayed Term of Use when first launching app', async () => {
    await TermsOfUseModal.isDisplayed();
  });

  it('should prevent attempts to bypass term of use', async () => {
    await TestHelpers.relaunchApp();
    await TermsOfUseModal.isDisplayed();
  });

  it('should accept to term of use', async () => {
    await TermsOfUseModal.tapScrollEndButton();
    await TermsOfUseModal.tapAgreeCheckBox();
    await TermsOfUseModal.tapAcceptButton();
    await TermsOfUseModal.isNotDisplayed();
    await OnboardingCarouselView.isVisible();
  });

  it('should restart app after accepting terms', async () => {
    await TestHelpers.relaunchApp();
    await OnboardingCarouselView.isVisible();
    await TermsOfUseModal.isNotDisplayed();
  });
});
