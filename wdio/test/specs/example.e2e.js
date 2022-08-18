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
    await driver.pause(5000);
    //await driver.setCapability('unicodeKeyboard', true);

    await OnboardingCarouselView.isVisible();
    // console.log(
    //   '********* HERE MY GOOOOD SIR',
    //   driver.capabilities.platformName,
    // );
    await Gestures.swipeLeft();
    await OnboardingCarouselView.tapOnGetStartedButton();

    //let caps = await driver.getPlatformName();

    await OnboardingView.isVisible();
    await OnboardingView.tapCreateWallet();

    // await MetaMetricsOptIn.isVisible();
    // await MetaMetricsOptIn.tapAgreeButton();

    await CreatePasswordView.isVisible();
    await CreatePasswordView.enterPassword(PASSWORD);
    await CreatePasswordView.reEnterPassword(PASSWORD);
    await CreatePasswordView.tapIUnderstandCheckBox();
    await CreatePasswordView.tapCreatePasswordButton();
  });
  it('Should skip backup check', async () => {
    // Check that we are on the Secure your wallet screen
    //await ProtectYourWalletView.isVisible();
    await ProtectYourWalletView.tapOnRemindMeLaterButton();

    await SkipAccountSecurityModal.tapIUnderstandCheckBox();
    await SkipAccountSecurityModal.tapSkipButton();
    //await WalletView.isVisible();
  });
});
