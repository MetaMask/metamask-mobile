import { Then, When } from '@wdio/cucumber-framework';
import ImportFromSeedScreen from '../screen-objects/Onboarding/ImportFromSeedScreen.js';
import CreateNewWalletScreen from '../screen-objects/Onboarding/CreateNewWalletScreen.js';
import WalletMainScreen from '../screen-objects/WalletMainScreen.js';
import MetaMetricsScreen from '../screen-objects/Onboarding/MetaMetricsScreen.js';
import OnboardingScreen from '../screen-objects/Onboarding/OnboardingScreen.js';
import WelcomeScreen from '../screen-objects/Onboarding/OnboardingCarousel.js';

import SkipAccountSecurityModal from '../screen-objects/Modals/SkipAccountSecurityModal.js';
import OnboardingWizardModal from '../screen-objects/Modals/OnboardingWizardModal.js';
import AddressBarScreen from '../screen-objects/BrowserObject/AddressBarScreen';

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

When(/^I tap "([^"]*)"/, async (text) => {
  switch (text) {
    case 'Get started':
      await WelcomeScreen.clickGetStartedButton();
      break;
    case 'Import using Secret Recovery Phrase':
      await OnboardingScreen.clickImportWalletButton();
      break;
    case 'I agree':
      await MetaMetricsScreen.tapIAgreeButton();
      break;
    case 'Import':
      await ImportFromSeedScreen.clickImportButton();
      break;
    case 'No, Thanks':
      await WalletMainScreen.tapNoThanks();
      break;
    case 'https://uniswap.exchange':
      await AddressBarScreen.tapUniswapSuggestionButton();
      break;
    default:
      throw new Error('Condition not found');
  }
});

Then(/^Wallet setup screen is displayed/, async () => {
  // await driver.pause(3000);
  await OnboardingScreen.isScreenTitleVisible();
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
  await ImportFromSeedScreen.isAlertTextVisible(text);
});

Then(/^password strength (.*) is displayed/, async (text) => {
  await ImportFromSeedScreen.isPasswordStrengthTextCorrect(text);
});

When(/^On Wallet Setup Screen I tap "([^"]*)?"/, async (text) => {
  switch (text) {
    case 'Create a new wallet':
      await OnboardingScreen.tapCreateNewWalletButton();
      break;
    case 'Agree':
      await MetaMetricsScreen.tapIAgreeButton();
      break;
    default:
      throw new Error('Condition not found');
  }
});

When(
  /^I am presented with a new Account screen with password fields/,
  async () => {
    await CreateNewWalletScreen.isNewAccountScreenFieldsVisible();
  },
);

When(/^I input a new password "([^"]*)?"/, async (password) => {
  await CreateNewWalletScreen.inputPasswordInFirstField(password);
});

When(/^I confirm the new password "([^"]*)?"/, async (password) => {
  await CreateNewWalletScreen.inputConfirmPasswordField(password);
});

When(/^Select "([^"]*)?" on remind secure modal/, async (button) => {
  await SkipAccountSecurityModal.isVisible();
  switch (button) {
    case 'Skip':
      await SkipAccountSecurityModal.proceedWithoutWalletSecure();
      break;
    case 'Cancel':
      break;
    default:
      throw new Error('Condition not found');
  }
});

When(/^I select remind me later on secure wallet screen/, async () => {
  await CreateNewWalletScreen.tapRemindMeLater();
});

When(/^secure wallet page is presented/, async () => {
  await CreateNewWalletScreen.isAccountCreated();
});

Then(/^I should proceed to the new wallet/, async () => {
  await CreateNewWalletScreen.isNotVisible();
});

Then(/^green check mark is displayed/, async () => {
  await ImportFromSeedScreen.isPasswordMatchIconVisible();
});
