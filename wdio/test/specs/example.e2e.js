'use strict';
import OnboardingCarouselView from '../pageobjects/Onboarding/OnboardingCarouselView';
import OnboardingView from '../pageobjects/Onboarding/OnboardingView';
import MetaMetricsOptIn from '../pageobjects/Onboarding/MetaMetricsOptInView';
import CreatePasswordView from '../pageobjects/Onboarding/CreatePasswordView';
import ProtectYourWalletView from '../pageobjects/Onboarding/ProtectYourWalletView';

import SkipAccountSecurityModal from '../pageobjects/Modals/SkipAccountSecurityModal';

import Gestures from '../pageobjects/Gestures';

const PASSWORD = '111111111';
describe('Browser Tests', () => {
  it('should create new wallet and dismiss tutorial', async () => {
    // Check that we are on the onboarding carousel screen
    await driver.setTimeouts(15000);
    await OnboardingCarouselView.isVisible();
    await Gestures.swipeLeft();
    await OnboardingCarouselView.tapOnGetStartedButton();

    await OnboardingView.isVisible();
    await OnboardingView.tapCreateWallet();

    await MetaMetricsOptIn.isVisible();
    await MetaMetricsOptIn.tapNoThanksButton();

    await CreatePasswordView.isVisible();
    await CreatePasswordView.enterPassword(PASSWORD);
    await CreatePasswordView.reEnterPassword(PASSWORD);
    await CreatePasswordView.tapIUnderstandCheckBox();
    await CreatePasswordView.tapCreatePasswordButton();
  });
  it('Should skip backup check', async () => {
    // Check that we are on the Secure your wallet screen
    await ProtectYourWalletView.isVisible();
    await ProtectYourWalletView.tapOnRemindMeLaterButton();

    await SkipAccountSecurityModal.tapIUnderstandCheckBox();
    await SkipAccountSecurityModal.tapSkipButton();
    //await WalletView.isVisible();
  });
});
