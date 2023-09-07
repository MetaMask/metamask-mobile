'use strict';
import { Smoke } from '../tags';

import TestHelpers from '../helpers';

import OnboardingView from '../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';
import ProtectYourWalletView from '../pages/Onboarding/ProtectYourWalletView';
import CreatePasswordView from '../pages/Onboarding/CreatePasswordView';

import MetaMetricsOptIn from '../pages/Onboarding/MetaMetricsOptInView';
import WalletView from '../pages/WalletView';
import EnableAutomaticSecurityChecksView from '../pages/EnableAutomaticSecurityChecksView';

import Browser from '../pages/Drawer/Browser';

import SkipAccountSecurityModal from '../pages/modals/SkipAccountSecurityModal';
import OnboardingWizardModal from '../pages/modals/OnboardingWizardModal';
import WhatsNewModal from '../pages/modals/WhatsNewModal';
import { acceptTermOfUse } from '../viewHelper';

const ACCOUNT = 'Test Account One';
const PASSWORD = '12345678';

describe(Smoke('Start Exploring'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should show the onboarding screen', async () => {
    // Check that we are on the onboarding carousel screen
    await OnboardingCarouselView.isVisible();

    await OnboardingCarouselView.isMetaMaskWelcomeTextVisible();
    await OnboardingCarouselView.isWelcomeToMetaMaskImageVisible();
    // Swipe left
    await OnboardingCarouselView.swipeCarousel();
    await OnboardingCarouselView.isManageYourDigitalTextVisible();

    // Check that title of screen 2 is correct
    await OnboardingCarouselView.isManageYourDigitalTextVisible();
    await OnboardingCarouselView.isManageYourDigitalImageVisible();
    // Swipe left
    await OnboardingCarouselView.swipeCarousel();
    // Check that title of screen 3 is correct
    await OnboardingCarouselView.isYourGatewayToWeb3TextVisible();
    await OnboardingCarouselView.isYourGatewayToWeb3ImageVisible();
    // Check that Get started CTA is visible & tap it
    await OnboardingCarouselView.tapOnGetStartedButton();
    await OnboardingView.isVisible();
  });

  it('should be able to opt-out of the onboarding-wizard', async () => {
    await OnboardingView.tapCreateWallet();

    await MetaMetricsOptIn.isVisible();
    await MetaMetricsOptIn.tapNoThanksButton();
    await acceptTermOfUse();
    await CreatePasswordView.isVisible();
  });

  it('should be able to create a new wallet', async () => {
    await CreatePasswordView.tapIUnderstandCheckBox();
    await CreatePasswordView.enterPassword(PASSWORD);
    await CreatePasswordView.reEnterPassword(PASSWORD);
    // await CreatePasswordView.tapCreatePasswordButton();
  });

  it('Should skip backup check', async () => {
    // Check that we are on the Secure your wallet screen
    await ProtectYourWalletView.isVisible();
    await ProtectYourWalletView.tapOnRemindMeLaterButton();

    await SkipAccountSecurityModal.tapIUnderstandCheckBox();
    await SkipAccountSecurityModal.tapSkipButton();
    await WalletView.isVisible();
  });

  it('Should dismiss Automatic Security checks screen', async () => {
    await TestHelpers.delay(3500);
    await EnableAutomaticSecurityChecksView.isVisible();
    await EnableAutomaticSecurityChecksView.tapNoThanks();
  });

  it('should go through the onboarding wizard flow', async () => {
    // Check that Take the tour CTA is visible and tap it

    await TestHelpers.delay(3000);

    await OnboardingWizardModal.isVisible();
    await OnboardingWizardModal.tapTakeTourButton();

    await OnboardingWizardModal.isYourAccountsTutorialStepVisible();
    await OnboardingWizardModal.tapGotItButton();

    // Ensure step 3 is shown correctly
    await OnboardingWizardModal.isEditAccountNameTutorialStepVisible();

    // await WalletView.editAccountName(ACCOUNT);

    await OnboardingWizardModal.tapGotItButton();

    await WalletView.isAccountNameCorrect(ACCOUNT);

    // Ensure step 4 is shown correctly
    await OnboardingWizardModal.isMainNavigationTutorialStepVisible();

    await OnboardingWizardModal.tapGotItButton();
    // Ensure step 5 is shown correctly

    await OnboardingWizardModal.isExploreTheBrowserTutorialStepVisible();
    // Tap on Back
    await OnboardingWizardModal.tapBackButton();

    // Ensure step 4 is shown correctly
    await OnboardingWizardModal.isMainNavigationTutorialStepVisible();
    await OnboardingWizardModal.tapGotItButton();

    // Ensure step 5 is shown correctly
    await OnboardingWizardModal.isExploreTheBrowserTutorialStepVisible();
    await OnboardingWizardModal.tapGotItButton();

    // Ensure step 6 is shown correctly
    await OnboardingWizardModal.isBrowserSearchStepTutorialVisible();
    await OnboardingWizardModal.tapBackButton();
    // Ensure step 5 is shown correctly
    await OnboardingWizardModal.isExploreTheBrowserTutorialStepVisible();
    await OnboardingWizardModal.tapBackButton();

    // Ensure step 4 is shown correctly
    await OnboardingWizardModal.isMainNavigationTutorialStepVisible();
    await OnboardingWizardModal.tapGotItButton();

    await OnboardingWizardModal.isExploreTheBrowserTutorialStepVisible();
    await OnboardingWizardModal.tapGotItButton();

    // Ensure step 6 is shown correctly
    await OnboardingWizardModal.isBrowserSearchStepTutorialVisible();
    await OnboardingWizardModal.tapGotItButton();
    // Check that we are on the Browser page

    // dealing with flakiness on bitrise.
    await TestHelpers.delay(2500);
    try {
      await WhatsNewModal.isVisible();
      await WhatsNewModal.tapCloseButton();
    } catch {
      //
    }
    await Browser.isVisible();
  });
});
