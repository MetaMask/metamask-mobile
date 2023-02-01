/* global driver */
import cucumberJson from 'wdio-cucumberjs-json-reporter';
import { Given, When, Then } from '@wdio/cucumber-framework';
import WalletMainScreen from '../screen-objects/WalletMainScreen';
import LoginScreen from '../screen-objects/LoginScreen';
import Accounts from '../helpers/Accounts';
import WelcomeScreen from '../screen-objects/Onboarding/OnboardingCarousel';

let startTimer;
let stopTimer;

Given(/^main Wallet Screen is displayed$/, async () => {
  await WalletMainScreen.isVisible();
});

When(/^I kill then app$/, async () => {
  await driver.closeApp();
});

When(/^I relaunch the app$/, async () => {
  await driver.startActivity('io.metamask.qa', 'io.metamask.MainActivity');
  startTimer = new Date().getTime();
});

When(/^I log into my wallet$/, async () => {
  const validAccount = Accounts.getValidAccount();
  await WelcomeScreen.isScreenTitleVisible();
  await LoginScreen.isLoginScreenVisible();
  await LoginScreen.typePassword(validAccount.password);
  await LoginScreen.tapTitle();
  await LoginScreen.tapUnlockButton();
  await WalletMainScreen.isVisible();
});

Then(/^the app should launch within x seconds$/, async () => {
  stopTimer = new Date().getTime();
  const result = stopTimer - startTimer;
  cucumberJson.attach(`Milliseconds: ${result}`);
});

Given(/^the app is closed$/, async () => {

});

When(/^I launch the app$/, async () => {

});
