/* global driver */
import { Given, Then, When } from '@wdio/cucumber-framework';
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
import LoginScreen from '../screen-objects/LoginScreen';

Given(/^the app displayed the splash animation$/, async () => {
  await WelcomeScreen.waitForSplashAnimationToDisplay();
});

Given(/^I have imported my wallet$/, async () => {
  const validAccount = Accounts.getValidAccount();
  await WelcomeScreen.waitForSplashAnimationToNotExit();
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

Given(/^I create a new wallet$/, async () => {
  const validAccount = Accounts.getValidAccount();
  await WelcomeScreen.waitForSplashAnimationToDisplay();
  await WelcomeScreen.waitForSplashAnimationToNotExit();
  await WelcomeScreen.clickGetStartedButton();
  await OnboardingScreen.isScreenTitleVisible();
  await OnboardingScreen.tapCreateNewWalletButton();
  await MetaMetricsScreen.isScreenTitleVisible();
  await MetaMetricsScreen.tapNoThanksButton();
  await CreateNewWalletScreen.isNewAccountScreenFieldsVisible();
  await CreateNewWalletScreen.inputPasswordInFirstField(validAccount.password);
  await CreateNewWalletScreen.inputConfirmPasswordField(validAccount.password); // Had to seperate steps due to onboarding video on physical device
});

Given(
  /^I tap the remind me later button on the Protect Your Wallet Modal$/,
  async () => {
    const timeOut = 3000;
    await driver.pause(timeOut);
    await WalletMainScreen.backupAlertModalIsVisible();
    await WalletMainScreen.tapRemindMeLaterOnNotification();
    await SkipAccountSecurityModal.proceedWithoutWalletSecure();
    if (await WalletMainScreen.backupAlertModalIsVisible()) {
      // on some devices clicking testID is not viable, so we use xpath if modal still visible
      await CommonScreen.tapOnText('Remind me later');
      await SkipAccountSecurityModal.proceedWithoutWalletSecure();
    }
  },
);

Given(/^I import wallet using seed phrase "([^"]*)?"/, async (phrase) => {
  const setTimeout = 20000;
  await driver.pause(setTimeout);
  await WelcomeScreen.clickGetStartedButton();
  await OnboardingScreen.clickImportWalletButton();
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

Then(/^I tap on button with text "([^"]*)?"/, async (text) => {
  const timeout = 1000;
  await driver.pause(timeout);
  await CommonScreen.tapOnText(text);
});

Then(
  /^I see "([^"]*)?" visible in the top navigation bar/,
  async (networkName) => {
    const timeout = 1000;
    await driver.pause(timeout);
    await WalletMainScreen.isNetworkNameCorrect(networkName);
  },
);

When(/^I log into my wallet$/, async () => {
  const validAccount = Accounts.getValidAccount();

  await WelcomeScreen.waitForSplashAnimationToDisplay();
  await WelcomeScreen.waitForSplashAnimationToNotExit();
  await LoginScreen.typePassword(validAccount.password);
  await LoginScreen.tapTitle();
  await LoginScreen.tapUnlockButton();
  await WalletMainScreen.isMainWalletViewVisible();
});
