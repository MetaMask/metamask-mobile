import TermsOfUseModal from '../../pages/modals/TermsOfUseModal';
import TestHelpers from '../../helpers';
import OnboardingCarouselView from '../../pages/Onboarding/OnboardingCarouselView';
import OnboardingView from '../../pages/Onboarding/OnboardingView';
import MetaMetricsOptIn from '../../pages/Onboarding/MetaMetricsOptInView';
import ImportWalletView from '../../pages/Onboarding/ImportWalletView';
import Assertions from '../../utils/Assertions';

describe('Term of service', () => {
  beforeEach(() => {
    jest.setTimeout(200000);
  });

  it('should displayed Term of Use when first launching app', async () => {
    await Assertions.checkIfVisible(OnboardingCarouselView.container);
    await OnboardingCarouselView.tapOnGetStartedButton();

    await Assertions.checkIfVisible(OnboardingView.container);
    await OnboardingView.tapImportWalletFromSeedPhrase();

    await Assertions.checkIfVisible(OnboardingCarouselView.container);
    await MetaMetricsOptIn.tapAgreeButton();
    await Assertions.checkIfVisible(TermsOfUseModal.container);
  });

  it('should prevent attempts to bypass term of use', async () => {
    await TestHelpers.relaunchApp();
    await Assertions.checkIfVisible(OnboardingCarouselView.container);
    await OnboardingCarouselView.tapOnGetStartedButton();
    await Assertions.checkIfVisible(OnboardingView.container);
    await OnboardingView.tapImportWalletFromSeedPhrase();
    await Assertions.checkIfVisible(TermsOfUseModal.container);
  });

  it('should accept to term of use', async () => {
    await TermsOfUseModal.tapScrollEndButton();
    await TermsOfUseModal.tapAgreeCheckBox();
    await TermsOfUseModal.tapAcceptButton();
    await Assertions.checkIfNotVisible(TermsOfUseModal.container);
    await Assertions.checkIfVisible(ImportWalletView.container);
  });

  it('should restart app after accepting terms', async () => {
    await TestHelpers.relaunchApp();
    await Assertions.checkIfVisible(OnboardingCarouselView.container);
    await OnboardingCarouselView.tapOnGetStartedButton();
    await Assertions.checkIfVisible(OnboardingView.container);
    await OnboardingView.tapImportWalletFromSeedPhrase();
    await Assertions.checkIfNotVisible(TermsOfUseModal.container);
  });
});
