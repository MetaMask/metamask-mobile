const { Given, When, Then } = require('@wdio/cucumber-framework');

const OnboardingPages = require('../pageobjects/onboarding.pages.js');

Given(/^I have installed MetaMask mobile app on my device/, async () => {
    /** This is automatically done by the automation framework **/
});


Given(/^I create a wallet/, async () => {
    await OnboardingCarouselView.isVisible();
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

When(/^I tap to open MetaMask mobile app/, async () => {
    // await driver.launchApp();
    // await driver.switchContext('NATIVE_APP');
    // await OnboardingPages.verifyWelcomeScreen();
    await driver.pause(15000);
});

Then(/^MetaMask animated loading logo is displayed/, async () => {
    // check for animated loading logo
    await OnboardingPages.verifyWelcomeScreen();

});

Then(/^(.*) screen is displayed after logo/, async (title) => {
    // check for Welcome to MetaMask screen
    await OnboardingPages.verifyWelcomeScreen();
});
