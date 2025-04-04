'use strict';
import { SmokeCore } from '../../tags';
import TestHelpers from '../../helpers';
import OnboardingView from '../../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../../pages/Onboarding/OnboardingCarouselView';
import ProtectYourWalletView from '../../pages/Onboarding/ProtectYourWalletView';
import CreatePasswordView from '../../pages/Onboarding/CreatePasswordView';
import MetaMetricsOptIn from '../../pages/Onboarding/MetaMetricsOptInView';
import OnboardingSuccessView from '../../pages/Onboarding/OnboardingSuccessView';
import EnableAutomaticSecurityChecksView from '../../pages/Onboarding/EnableAutomaticSecurityChecksView';
import Browser from '../../pages/Browser/BrowserView';
import SkipAccountSecurityModal from '../../pages/Onboarding/SkipAccountSecurityModal';
import OnboardingWizardModal from '../../pages/Onboarding/OnboardingWizardModal';
import { acceptTermOfUse } from '../../viewHelper';
import Assertions from '../../utils/Assertions';

const PASSWORD = '12345678';

describe(SmokeCore('Start Exploring'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.launchApp();
  });

  it('should show the onboarding screen', async () => {
    // Check that we are on the onboarding carousel screen
    await Assertions.checkIfVisible(OnboardingCarouselView.container);
    await Assertions.checkIfVisible(OnboardingCarouselView.titleOne);
    await Assertions.checkIfVisible(OnboardingCarouselView.imageOne);
    await OnboardingCarouselView.swipeCarousel();
    await Assertions.checkIfVisible(OnboardingCarouselView.titleTwo);
    await Assertions.checkIfVisible(OnboardingCarouselView.imageTwo);
    await OnboardingCarouselView.swipeCarousel();
    await Assertions.checkIfVisible(OnboardingCarouselView.titleThree);
    await Assertions.checkIfVisible(OnboardingCarouselView.imageThree);
    await OnboardingCarouselView.tapOnGetStartedButton();
    await Assertions.checkIfVisible(OnboardingView.container);
  });

  it('should be able to opt-out of the onboarding-wizard', async () => {
    await OnboardingView.tapCreateWallet();
    await Assertions.checkIfVisible(MetaMetricsOptIn.container);
    await MetaMetricsOptIn.tapNoThanksButton();
    await acceptTermOfUse();
    await Assertions.checkIfVisible(CreatePasswordView.container);
  });

  it('should be able to create a new wallet', async () => {
    await CreatePasswordView.tapIUnderstandCheckBox();
    await CreatePasswordView.enterPassword(PASSWORD);
    await CreatePasswordView.reEnterPassword(PASSWORD);
  });

  it('Should skip backup check', async () => {
    // Check that we are on the Secure your wallet screen
    await Assertions.checkIfVisible(ProtectYourWalletView.container);
    await ProtectYourWalletView.tapOnRemindMeLaterButton();
    await SkipAccountSecurityModal.tapIUnderstandCheckBox();
    await SkipAccountSecurityModal.tapSkipButton();
  });

  it('Should skip onboarding success screen', async () => {
    // Press Done on the Onboarding Success screen
    await OnboardingSuccessView.tapDone();
  });

  it('Should dismiss Automatic Security checks screen', async () => {
    await TestHelpers.delay(3500);
    await Assertions.checkIfVisible(
      EnableAutomaticSecurityChecksView.container,
    );
    await EnableAutomaticSecurityChecksView.tapNoThanks();
  });

  it('should go through the onboarding wizard flow', async () => {
    // Check that Take the tour CTA is visible and tap it
    await TestHelpers.delay(3000);
    await Assertions.checkIfVisible(OnboardingWizardModal.stepOneContainer);
    await OnboardingWizardModal.tapTakeTourButton();
    await Assertions.checkIfVisible(OnboardingWizardModal.stepTwoContainer);
    await OnboardingWizardModal.tapGotItButton();
    // Ensure step 3 is shown correctly
    await Assertions.checkIfVisible(OnboardingWizardModal.stepThreeContainer);
    // await WalletView.editAccountName(ACCOUNT);
    await OnboardingWizardModal.tapGotItButton();
    await TestHelpers.delay(3000);
    // Ensure step 4 is shown correctly
    await Assertions.checkIfVisible(OnboardingWizardModal.stepFourContainer);
    await OnboardingWizardModal.tapGotItButton();
    // Ensure step 5 is shown correctly
    await Assertions.checkIfVisible(OnboardingWizardModal.stepFiveContainer);
    // Tap on Back
    await OnboardingWizardModal.tapBackButton();
    await TestHelpers.delay(3000);
    // Ensure step 4 is shown correctly
    await Assertions.checkIfVisible(OnboardingWizardModal.stepFourContainer);
    await OnboardingWizardModal.tapGotItButton();
    // Ensure step 5 is shown correctly
    await Assertions.checkIfVisible(OnboardingWizardModal.stepFiveContainer);
    await OnboardingWizardModal.tapGotItButton();
    // Ensure step 6 is shown correctly
    await Assertions.checkIfVisible(OnboardingWizardModal.stepSixContainer);
    await OnboardingWizardModal.tapBackButton();
    // Ensure step 5 is shown correctly
    await Assertions.checkIfVisible(OnboardingWizardModal.stepFiveContainer);
    await OnboardingWizardModal.tapBackButton();
    await TestHelpers.delay(3000);
    // Ensure step 4 is shown correctly
    await Assertions.checkIfVisible(OnboardingWizardModal.stepFourContainer);
    await OnboardingWizardModal.tapGotItButton();
    await Assertions.checkIfVisible(OnboardingWizardModal.stepFiveContainer);
    await OnboardingWizardModal.tapGotItButton();
    // Ensure step 6 is shown correctly
    await Assertions.checkIfVisible(OnboardingWizardModal.stepSixContainer);
    await OnboardingWizardModal.tapGotItButton();
    // Ensure step 7 is shown correctly
    await Assertions.checkIfVisible(OnboardingWizardModal.stepSevenContainer);
    await OnboardingWizardModal.tapGotItButton();
    // Check that we are on the Browser page
    // dealing with flakiness on bitrise.
    await TestHelpers.delay(2500);
    await Assertions.checkIfVisible(Browser.browserScreenID);
  });
});
