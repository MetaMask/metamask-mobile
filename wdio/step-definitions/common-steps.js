/* global driver */
import { Given, Then } from '@wdio/cucumber-framework';
import Accounts from '../helpers/Accounts';
import WelcomeScreen from '../screen-objects/Onboarding/OnboardingCarousel';
import OnboardingScreen from '../screen-objects/Onboarding/OnboardingScreen';
import MetaMetricsScreen from '../screen-objects/Onboarding/MetaMetricsScreen';
import ImportFromSeedScreen from '../screen-objects/Onboarding/ImportFromSeedScreen';

import CreateNewWalletScreen from '../screen-objects/Onboarding/CreateNewWalletScreen.js';
import WalletMainScreen from '../screen-objects/WalletMainScreen';
import CommonScreen from '../screen-objects/CommonScreen';

import SkipAccountSecurityModal from '../screen-objects/Modals/SkipAccountSecurityModal.js';
import OnboardingWizardModal from '../screen-objects/Modals/OnboardingWizardModal.js';

Given(/^I have imported my wallet$/, async () => {
  const validAccount = Accounts.getValidAccount();
  // await WelcomeScreen.isScreenTitleVisible();
  await driver.pause(22000); //TODO: Needs a smarter set timeout
  await WelcomeScreen.clickGetStartedButton();
  await OnboardingScreen.isScreenTitleVisible();
  await OnboardingScreen.clickImportWalletButton();
  await MetaMetricsScreen.isScreenTitleVisible();
  await MetaMetricsScreen.tapIAgreeButton();
  await ImportFromSeedScreen.isScreenTitleVisible();
  await ImportFromSeedScreen.typeSecretRecoveryPhrase(validAccount.seedPhrase);
  await ImportFromSeedScreen.typeNewPassword(validAccount.password);
  await ImportFromSeedScreen.typeConfirmPassword(validAccount.password);
  await ImportFromSeedScreen.clickImportButton();
});

Given(/^I have created my wallet$/, async () => {
  // should be in a common step file
  const validAccount = Accounts.getValidAccount();
  await WelcomeScreen.isScreenTitleVisible();
  await driver.pause(13000); //TODO: Needs a smarter set timeout
  await WelcomeScreen.clickGetStartedButton();
  await OnboardingScreen.isScreenTitleVisible();
  await OnboardingScreen.tapCreateNewWalletButton();
  await MetaMetricsScreen.isScreenTitleVisible();
  await MetaMetricsScreen.tapNoThanksButton();
  await CreateNewWalletScreen.isNewAccountScreenFieldsVisible();
  await CreateNewWalletScreen.inputPasswordInFirstField(validAccount.password);
  await CreateNewWalletScreen.inputConfirmPasswordField(validAccount.password);
  await SkipAccountSecurityModal.isVisible();
  await SkipAccountSecurityModal.proceedWithoutWalletSecure();
  await CreateNewWalletScreen.selectRemindMeLater();
  await CreateNewWalletScreen.isAccountCreated();
  await CreateNewWalletScreen.isNotVisible();
});

Given(/^I import wallet using seed phrase "([^"]*)?"/, async (phrase) => {
  const setTimeout = 50000;
  await driver.pause(setTimeout);
  await WelcomeScreen.clickGetStartedButton();
  await OnboardingScreen.clickImportWalletButton();
  await MetaMetricsScreen.swipeUp();
  await MetaMetricsScreen.tapIAgreeButton();
  const validAccount = Accounts.getValidAccount();
  await ImportFromSeedScreen.typeSecretRecoveryPhrase(phrase);
  await ImportFromSeedScreen.typeNewPassword(validAccount.password);
  await ImportFromSeedScreen.typeConfirmPassword(validAccount.password);
  await ImportFromSeedScreen.clickImportButton();
});

Given(/^I tap No thanks on the onboarding welcome tutorial/, async () => {
  await OnboardingWizardModal.isVisible();
  const setTimeout = 1500;
  await driver.pause(setTimeout);
  await OnboardingWizardModal.tapNoThanksButton();
});

Then(/^"([^"]*)?" is visible/, async (text) => {
  const timeout = 1000;
  await driver.pause(timeout);
  await CommonScreen.isTextDisplayed(text);
});

Then(/^"([^"]*)?" is not displayed/, async (text) => {
  const timeout = 1000;
  await driver.pause(timeout);
  await CommonScreen.isTextElementNotDisplayed(text);
});

Then(/^I am on the main wallet view/, async () => {
  const timeout = 1000;
  await driver.pause(timeout);
  await WalletMainScreen.isMainWalletViewVisible();
});
