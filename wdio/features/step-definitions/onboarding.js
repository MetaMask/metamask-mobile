import { Given, When, Then } from '@wdio/cucumber-framework';
import assert from 'assert';
import Accounts from '../helpers/Accounts.js';
import ImportFromSeedScreen from '../screen-objects/ImportFromSeedScreen.js';
import OptinMetricsScreen from '../screen-objects/OptinMetricsScreen.js';
import WalletMainScreen from '../screen-objects/WalletMainScreen.js';
import WalletSetupScreen from '../screen-objects/WalletSetupScreen.js';
import WelcomeScreen from '../screen-objects/WelcomeScreen.js';

Given(/^I just installed MetaMask on my device/, async () => {
  /** This is automatically done by the automation framework **/
});

When(/^I launch MetaMask mobile app/, async () => {
  /** This is automatically done by the automation framework **/
});

Then(/^"([^"]*)?" is displayed/, async (text) => {
  switch (text) {
    case 'METAMASK':
      await WelcomeScreen.verifySplashScreen();
      break;
    case 'Wallet setup':
      await WalletSetupScreen.verifyScreenTitle();
      break;
    case 'Import an existing wallet or create a new one':
      await WalletSetupScreen.verifyScreenDescription();
      break;
    case 'Import using Secret Recovery Phrase':
      await WalletSetupScreen.verifyImportWalletButton();
      break;
    case 'Create a new wallet':
      await WalletSetupScreen.verifyCreateNewWalletButton();
      break;
    case 'By proceeding, you agree to these Terms and Conditions.':
      await WalletSetupScreen.verifyTermsAndConditionsButton();
      break;
    case 'Help us improve MetaMask':
      await OptinMetricsScreen.verifyScreenTitle();
      break;
    case 'Import from seed':
      await ImportFromSeedScreen.verifyScreenTitle();
      break;
    case 'Welcome to your new wallet!':
      // await driver.pause(10000);
      await WalletMainScreen.validateOnboardingWizard();
      break;
    default:
      throw new Error('Condition not found');
  }
});

Then(/^"([^"]*)?" carousel item is displayed/, async (text) => {
  switch (text) {
    case 'Welcome to MetaMask':
      await WelcomeScreen.verifyCarouselTitle(1);
      break;
    case 'Manage your digital assets':
      await WelcomeScreen.verifyCarouselTitle(2);
      break;
    case 'Your gateway to web3':
      await WelcomeScreen.verifyCarouselTitle(3);
      break;
    default:
      throw new Error('Condition not found');
  }
});

When(/^I swipe left on the carousel/, async () => {
  await WelcomeScreen.swipeNextSlide();
});

When(/^I tap "([^"]*)?"/, async (text) => {
  switch (text) {
    case 'Get started':
      await driver.pause(7000) //TODO: Needs a smarter set timeout 
      await WelcomeScreen.clickGetStartedButton();
      break;
    case 'Import using Secret Recovery Phrase':
      await WalletSetupScreen.clickImportWalletButton();
      break;
    case 'I agree':
      await OptinMetricsScreen.clickIAgreeButton();
      break;
    case 'Import':
      await ImportFromSeedScreen.clickImportButton();
      break;
    default:
      throw new Error('Condition not found');
  }
});

When(/^I type (.*) in SRP field/, async (text) => {
  await ImportFromSeedScreen.typeSecretRecoveryPhrase(text);
});

When(/^I type (.*) in new password field/, async (text) => {
  await ImportFromSeedScreen.typeNewPassword(text);
});

When(/^I type (.*) in confirm password field/, async (text) => {
  await ImportFromSeedScreen.typeConfirmPassword(text);
});

Then(/^device alert (.*) is displayed/, async (text) => {
  const msg = await driver.getAlertText();
  console.log(`## Alert text is: ${msg}`);
  assert(msg.includes(text));
  driver.acceptAlert();
});

When(/^I retype (.*) in new password field/, async (text) => {
  await ImportFromSeedScreen.retypeNewPassword(text);
});

Then(/^password strength (.*) is displayed/, async (text) => {
  await ImportFromSeedScreen.assertPasswordStrength(text);
});

When(/^On Wallet Setup Screen I tap "([^"]*)?"/, async (text) => {
  switch (text) {
    case 'Create a new wallet':
      await WalletSetupScreen.tapCreateNewWalletBtn();
      break;
      case 'Agree':
      await WalletSetupScreen.tapAgreeDataGathering();
      break;
    default:
      throw new Error('Condition not found');
  }
});

When(/^I am presented with a new Account screen with password fields/, async () => {
  await WalletSetupScreen.assertNewAccountScreenFields();
});

When(/^I input a new password "([^"]*)?"/, async (password) => {
  await WalletSetupScreen.inputPasswordInFirstField(password);
});

When(/^I confirm the new password "([^"]*)?"/, async (password) => {
  await WalletSetupScreen.inputConfirmPasswordField(password);
});

When(/^Select "([^"]*)?" on remind secure modal/, async (btn) => {
  await WalletSetupScreen.assertSkipSecurityModal();
  switch (btn) {
    case 'Skip':
      await WalletSetupScreen.proceedWithoutWalletSecure();
      break;
      case 'Cancel':
      break;
    default:
      throw new Error('Condition not found');
  }
});

When(/^I select remind me later on secure wallet screen/, async () => {
  await WalletSetupScreen.selectRemindMeLater();
});

When(/^secure wallet page is presented/, async () => {
  await WalletSetupScreen.accountCreatedAssertion()
});

Then(/^I should proceed to the new wallet/, async () => {
  await WalletSetupScreen.assertNewWalletWelcomeTutorial();
});

