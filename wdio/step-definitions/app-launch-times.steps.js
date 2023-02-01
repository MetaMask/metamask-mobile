/* global driver */
import cucumberJson from 'wdio-cucumberjs-json-reporter';
import { Given, When, Then } from '@wdio/cucumber-framework';

import WalletMainScreen from '../screen-objects/WalletMainScreen';
import LoginScreen from '../screen-objects/LoginScreen';
import Accounts from '../helpers/Accounts';
import WelcomeScreen from '../screen-objects/Onboarding/OnboardingCarousel';
import OnboardingScreen from '../screen-objects/Onboarding/OnboardingScreen';
import MetaMetricsScreen from '../screen-objects/Onboarding/MetaMetricsScreen';
import ImportFromSeedScreen from '../screen-objects/Onboarding/ImportFromSeedScreen';

let startTimer;
let stopTimer;
const validAccount = Accounts.getValidAccount();

Given(/^main Wallet Screen is displayed$/, async () => {
  await WalletMainScreen.isMainWalletViewVisible();
});

When(/^I kill then app$/, async () => {
  await driver.closeApp();
});

When(/^I relaunch the app$/, async () => {
  await driver.startActivity('io.metamask.qa', 'io.metamask.MainActivity');
  startTimer = new Date().getTime();
});

When(/^I log into my wallet$/, async () => {
  await WelcomeScreen.isScreenTitleVisible();
  await LoginScreen.isLoginScreenVisible();
  await LoginScreen.typePassword(validAccount.password);
  await LoginScreen.tapTitle();
  await LoginScreen.tapUnlockButton();
  await WalletMainScreen.isMainWalletViewVisible();
});

Then(/^the app should launch within x seconds$/, async () => {
  stopTimer = new Date().getTime();
  const result = stopTimer - startTimer;
  cucumberJson.attach(`Milliseconds: ${result}`);
});

Given(/^the app is closed$/, async () => {
  startTimer = new Date().getTime();
});

When(/^I launch the app$/, async () => {
  await WelcomeScreen.waitForSplashAnimationToDisplay();
});

Given(/^I have imported my wallet for app launch times$/, async () => {
  await WelcomeScreen.waitForSplashAnimationToDisappear();
  await WelcomeScreen.clickGetStartedButton();
  await OnboardingScreen.isScreenTitleVisible();
  await OnboardingScreen.clickImportWalletButton();
  await MetaMetricsScreen.isScreenTitleVisible();
  await MetaMetricsScreen.tapIAgreeButton();
  await ImportFromSeedScreen.isScreenTitleVisible();
  await ImportFromSeedScreen.setLoginBiometrics('OFF');
  await ImportFromSeedScreen.typeSecretRecoveryPhrase(validAccount.seedPhrase);
  await ImportFromSeedScreen.typeNewPassword(validAccount.password);
  await ImportFromSeedScreen.typeConfirmPassword(validAccount.password);
  await ImportFromSeedScreen.clickImportButton();
});
