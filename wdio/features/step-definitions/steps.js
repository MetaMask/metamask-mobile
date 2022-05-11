const { Given, When, Then } = require('@wdio/cucumber-framework');

const OnboardingPages = require('../pageobjects/onboarding.pages.js');

Given(/^I have installed MetaMask mobile app on my device/, async () => {
    /** This is automatically done by the automation framework **/
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
