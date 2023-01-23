/* global driver */
import { Given, Then} from '@wdio/cucumber-framework';
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
import Gestures from '../../features/helpers/Gestures';

Given(/^I have imported my wallet$/, async () => {
  const validAccount = Accounts.getValidAccount();
  await WelcomeScreen.isScreenTitleVisible();
  await driver.pause(10000); //TODO: Needs a smarter set timeout
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

Given(/^I have created my wallet$/, async () => { // should be in a common step file
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
  await WalletMainScreen.isMainWalletViewVisible();
});

Given(/^I tap No thanks on the onboarding welcome tutorial/, async () => {
  await OnboardingWizardModal.isVisible();
  const setTimeout = 1500;
  await driver.pause(setTimeout);
  await OnboardingWizardModal.tapNoThanksButton();
});

Then(/^I tap button "([^"]*)?" on (.*) (.*) view/, async (button, screen, type) => {
  const timeout = 1000;
    await driver.pause(timeout);
    await Gestures.tapTextByXpath(button);
});

Then(/^I tap button "([^"]*)?" to navigate to (.*) view/, async (button, screen) => {
  const timeout = 1000;
  await driver.pause(timeout);
  await Gestures.tapTextByXpath(button);
});

Then(/^(.*) "([^"]*)?" is displayed on (.*) (.*) view/, async (elementType, text, type, screen) => {
  const timeout = 1000;
  await driver.pause(timeout);
  await CommonScreen.isTextDisplayed(text);
});

Then(/^(.*) "([^"]*)?" is not displayed on (.*) (.*) view/, async (elementType, textElement, type, screen) => {
  const timeout = 1000;
  await driver.pause(timeout);
  await CommonScreen.isTextElementNotDisplayed(textElement);
});

Then(/^I am on the main wallet view/, async () => {
  const timeout = 1000;
  await driver.pause(timeout);
  await WalletMainScreen.isMainWalletViewVisible();
});
