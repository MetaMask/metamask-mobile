import { Given, When, Then } from '@wdio/cucumber-framework';
import ImportWalletScreen from '../screen-objects/ImportWalletScreen.js';
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
    case 'Import from seed':
      await ImportWalletScreen.verifyScreenTitle();
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
      await WelcomeScreen.clickGetStartedButton();
      break;
    case 'Import using Secret Recovery Phrase':
      await WalletSetupScreen.clickImportWalletButton();
      break;
    default:
      throw new Error('Condition not found');
  }
});
