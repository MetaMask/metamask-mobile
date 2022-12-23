/* global driver */
import { Given, When, Then } from '@wdio/cucumber-framework';
import ImportFromSeedScreen from '../screen-objects/Onboarding/ImportFromSeedScreen.js';
import MetaMetricsScreen from '../screen-objects/Onboarding/MetaMetricsScreen.js';
import OnboardingScreen from '../screen-objects/Onboarding/OnboardingScreen.js';
import WelcomeScreen from '../screen-objects/Onboarding/OnboardingCarousel.js';
import OnboardingWizardModal from '../screen-objects/Modals/OnboardingWizardModal.js';
import Accounts from '../helpers/Accounts';
import WalletMainScreen from '../screen-objects/WalletMainScreen';
import SendScreen from '../../features/screen-objects/SendScreen';
import Gestures from '../../features/helpers/Gestures';

Given(/^I import wallet using seed phrase "([^"]*)?"/, async (phrase) => {
  const setTimeout = 10000;//added for running on physical device
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

  When(/^I am back to the wallet view/, async () => {
    await WalletMainScreen.isVisible();
  });

  Then(/^I tap on "([^"]*)?" in the menu/, async (option) => {
    switch (option) {
      case 'Settings':
        await WalletMainScreen.tapSettings();
        break;
      default:
        throw new Error('Option not found');
    }
  });

  Then(/^I tap on button with text "([^"]*)?"/, async (text) => {
    const timeout = 1000;
    await driver.pause(timeout);
    await SendScreen.tapOnText(text);
});

Then(/^I tap button "([^"]*)?" on (.*) (.*) view/, async (button, type, screen) => {
    const timeout = 1000;
    await driver.pause(timeout);
    await Gestures.tapTextByXpath(button);
    // eslint-disable-next-line no-console
    console.log('On screen ' + type + ' ' + screen);
});

Then(/^I tap button "([^"]*)?" to navigate to (.*) view/, async (button, screen) => {
    const timeout = 1000;
    await driver.pause(timeout);
    await Gestures.tapTextByXpath(button);
    // eslint-disable-next-line no-console
    console.log('On screen ' + screen);
});

// Then(/^I type "([^"]*)?" onto (.*) (.*) field/, async (text, type, screen) => {
//     const timeout = 1000;
//     await driver.pause(timeout);
//     await Gestures.typeText(text);
//     // eslint-disable-next-line no-console
//     console.log('I type on field' + type + ' ' + screen);
// });
