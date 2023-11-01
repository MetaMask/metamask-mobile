import TermsOfUseModal from '../pages/modals/TermsOfUseModal';
import TestHelpers from '../helpers';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';
import OnboardingView from '../pages/Onboarding/OnboardingView';
import MetaMetricsOptIn from '../pages/Onboarding/MetaMetricsOptInView';
import ImportWalletView from '../pages/Onboarding/ImportWalletView';

describe('Term of service', () => {
  beforeEach(() => {
    jest.setTimeout(200000);
  });

  it('should displayed Term of Use when first launching app', async () => {
    await OnboardingCarouselView.isVisible();
    await OnboardingCarouselView.tapOnGetStartedButton();

    await OnboardingView.isVisible();
    await OnboardingView.tapImportWalletFromSeedPhrase();

    await MetaMetricsOptIn.isVisible();
    await MetaMetricsOptIn.tapAgreeButton();
    await TermsOfUseModal.isDisplayed();
  });

  it('should prevent attempts to bypass term of use', async () => {
    await TestHelpers.relaunchApp();
    await OnboardingCarouselView.isVisible();
    await OnboardingCarouselView.tapOnGetStartedButton();
    await OnboardingView.isVisible();
    await OnboardingView.tapImportWalletFromSeedPhrase();
    await TermsOfUseModal.isDisplayed();
  });

  it('should accept to term of use', async () => {
    await TermsOfUseModal.tapScrollEndButton();
    await TermsOfUseModal.tapAgreeCheckBox();
    await TermsOfUseModal.tapAcceptButton();
    await TermsOfUseModal.isNotDisplayed();
    await ImportWalletView.isVisible();
  });

  it('should restart app after accepting terms', async () => {
    await TestHelpers.relaunchApp();
    await OnboardingCarouselView.isVisible();
    await OnboardingCarouselView.tapOnGetStartedButton();
    await OnboardingView.isVisible();
    await OnboardingView.tapImportWalletFromSeedPhrase();
    await TermsOfUseModal.isNotDisplayed();
  });
});
