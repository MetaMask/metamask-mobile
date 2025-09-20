import { Given, Then, When } from '@wdio/cucumber-framework';
import Accounts from '../helpers/Accounts';
import WelcomeScreen from '../screen-objects/Onboarding/OnboardingCarousel';
import OnboardingScreen from '../screen-objects/Onboarding/OnboardingScreen';
import MetaMetricsScreen from '../screen-objects/Onboarding/MetaMetricsScreen';
import ImportFromSeedScreen from '../screen-objects/Onboarding/ImportFromSeedScreen';
import TabBarModal from '../screen-objects/Modals/TabBarModal';
import CreateNewWalletScreen from '../screen-objects/Onboarding/CreateNewWalletScreen.js';
import WalletMainScreen from '../screen-objects/WalletMainScreen';
import CommonScreen from '../screen-objects/CommonScreen';
import SkipAccountSecurityModal from '../screen-objects/Modals/SkipAccountSecurityModal.js';
import LoginScreen from '../screen-objects/LoginScreen';
import TermOfUseScreen from '../screen-objects/Modals/TermOfUseScreen';
import WhatsNewModal from '../screen-objects/Modals/WhatsNewModal';
import Gestures from '../helpers/Gestures';
import OnboardingSucessScreen from '../screen-objects/OnboardingSucessScreen.js';
import SettingsScreen from '../screen-objects/SettingsScreen';
import CreatePasswordScreen from '../screen-objects/Onboarding/CreatePasswordScreen';
import OnboardingSheet from '../screen-objects/Onboarding/OnboardingSheet';
const SEEDLESS_ONBOARDING_ENABLED = process.env.SEEDLESS_ONBOARDING_ENABLED === 'true';

Then(/^the Welcome screen is displayed$/, async () => {
  await WelcomeScreen.isScreenDisplayed();
});

Given(/^the app displayed the splash animation$/, async () => {
  await WelcomeScreen.isScreenDisplayed();
});

Then(/^Terms of Use is displayed$/, async () => {
  await TermOfUseScreen.isDisplayed();
  await TermOfUseScreen.textIsDisplayed();
});

When(/^I agree to terms$/, async () => {
  await TermOfUseScreen.isDisplayed();
  await TermOfUseScreen.tapScrollEndButton();
  await TermOfUseScreen.tapAgreeCheckBox();
  await TermOfUseScreen.tapAcceptButton();
});

Then(/^Terms of Use is not displayed$/, async () => {
  await TermOfUseScreen.isNotDisplayed();
});

Given(/^I have imported my wallet$/, async () => {
  const validAccount = Accounts.getValidAccount();
  const timeOut = 3000;
  await driver.pause(timeOut);
  await OnboardingScreen.tapHaveAnExistingWallet();

  if (SEEDLESS_ONBOARDING_ENABLED) {
    await OnboardingSheet.tapImportSeedButton();
  }
  await driver.pause(500);
  await ImportFromSeedScreen.isScreenTitleVisible();
  await ImportFromSeedScreen.typeSecretRecoveryPhrase(validAccount.seedPhrase);
  await ImportFromSeedScreen.tapImportScreenTitleToDismissKeyboard();
  await ImportFromSeedScreen.tapContinueButton();
  await driver.pause(500);
  await CreatePasswordScreen.enterPassword(validAccount.password);
  await CreatePasswordScreen.reEnterPassword(validAccount.password);
  await CreatePasswordScreen.tapIUnderstandCheckBox();
  await CreatePasswordScreen.tapCreatePasswordButton();
  await driver.pause(timeOut);
  await MetaMetricsScreen.isScreenTitleVisible();
  await MetaMetricsScreen.tapIAgreeButton();
  await driver.pause(timeOut);
  await OnboardingSucessScreen.tapDone()
});

Given(/^I create a new wallet$/, async () => {
  const validAccount = Accounts.getValidAccount();

  await WelcomeScreen.waitForScreenToDisplay();
  await WelcomeScreen.clickGetStartedButton();
  await TermOfUseScreen.isDisplayed();
  await TermOfUseScreen.tapAgreeCheckBox();
  await TermOfUseScreen.tapScrollEndButton();
  await driver.pause();
  await TermOfUseScreen.tapAcceptButton();
  await OnboardingScreen.tapCreateNewWalletButton();
  if (SEEDLESS_ONBOARDING_ENABLED) {
    await OnboardingSheet.tapImportSeedButton();
  }
  await CreateNewWalletScreen.isNewAccountScreenFieldsVisible();
  await CreateNewWalletScreen.inputPasswordInFirstField(validAccount.password);
  await CreateNewWalletScreen.inputConfirmPasswordField(validAccount.password); // Had to seperate steps due to onboarding video on physical device
  await MetaMetricsScreen.isScreenTitleVisible();
  await MetaMetricsScreen.tapIAgreeButton();
  await driver.pause(timeOut);
  await OnboardingSucessScreen.tapDone()
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
  const validAccount = Accounts.getValidAccount();
  await ImportFromSeedScreen.typeSecretRecoveryPhrase(phrase);
  await ImportFromSeedScreen.typeNewPassword(validAccount.password);
  await ImportFromSeedScreen.typeConfirmPassword(validAccount.password);
  await ImportFromSeedScreen.clickImportButton();
});

Given(/^I tap No thanks on the onboarding welcome tutorial/, async () => {
  const setTimeout = 1500;
  await driver.pause(setTimeout);
});

Then(/^"([^"]*)?" is visible/, async (text) => {
  const timeout = 2500;
  await driver.pause(timeout);
  await CommonScreen.isTextDisplayed(text);
});

Then(/^"([^"]*)?" is displayed on (.*) (.*) view/, async (text) => {
  const timeout = 1000;
  await driver.pause(timeout);
  await CommonScreen.isTextDisplayed(text);
});

Then(/^"([^"]*)?" is displayed/, async (text) => {
  const timeout = 1000;
  await driver.pause(timeout);
  await CommonScreen.isTextDisplayed(text);
});

Then(/^version "([^"]*)?" is displayed for app upgrade step/, async (text) => {
  const appUpgradeText = process.env[text];
  const timeout = 1000;
  await driver.pause(timeout);
  await CommonScreen.isTextDisplayed(appUpgradeText);
});

Then(/^"([^"]*)?" is not displayed/, async (text) => {
  const timeout = 1000;
  await driver.pause(timeout);
  await CommonScreen.isTextElementNotDisplayed(text);
});

Then(/^Sending token takes me to main wallet view/, async () => {
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
  await LoginScreen.tapUnlockButton();
  // await driver.pause(10000); // this seems excessive. If we have to wait this long
  await WalletMainScreen.isMainWalletViewVisible();
});

When(/^I kill the app$/, async () => {
  const platform = await driver.getPlatform();

  await driver.terminateApp(platform === 'ios' ? 'io.metamask.MetaMask-QA' : 'io.metamask.qa');
});

When(/^I relaunch the app$/, async () => {
  const platform = await driver.getPlatform();
  if (platform === 'iOS') {
    await driver.activateApp('io.metamask.MetaMask-QA');
  }

  if (platform === 'Android') {
    await driver.startActivity('io.metamask.qa', 'io.metamask.MainActivity');
  }
});

When(/^I fill my password in the Login screen$/, async () => {
  const validAccount = Accounts.getValidAccount();

  await LoginScreen.waitForScreenToDisplay();
  await LoginScreen.typePassword(validAccount.password);
  await LoginScreen.tapTitle();
  await LoginScreen.tapTitle();
});
When(/^I unlock wallet with (.*)$/, async (password) => {
  await LoginScreen.waitForScreenToDisplay();
  await LoginScreen.typePassword(password);
  await LoginScreen.tapTitle();
  await LoginScreen.tapUnlockButton();
  await WalletMainScreen.isMainWalletViewVisible();
});

Then(
  /^I tap (.*) "([^"]*)?" on (.*) (.*) view/,
  async (elementType, button) => {
    await CommonScreen.checkNoNotification(); // Notification appears a little late and inteferes with clicking function
    await CommonScreen.tapOnText(button);
  },
);

Then(/^I tap (.*) containing text "([^"]*)?"/, async (elementType, button) => {
  await CommonScreen.tapTextContains(button);
});

Then(
  /^I tap button "([^"]*)?" to navigate to (.*) view/,
  async (button) => {
    await CommonScreen.tapOnText(button);
    await CommonScreen.tapOnText(button);
  },
);

Then(
  /^(.*) "([^"]*)?" is displayed on (.*) (.*) view/,
  async (elementType, text) => {
    await CommonScreen.isTextDisplayed(text);
  },
);

Then(
  /^(.*) "([^"]*)?" is not displayed on (.*) (.*) view/,
  async (elementType, textElement) => {
    await CommonScreen.isTextElementNotDisplayed(textElement);
  },
);

Then(/^I am on the main wallet view/, async () => {
  await WalletMainScreen.isMainWalletViewVisible();
});

When(/^the toast is displayed$/, async () => {
  await CommonScreen.waitForToastToDisplay();
  await CommonScreen.waitForToastToDisappear();
});

Given(/^I close the Whats New modal$/, async () => {
  await WhatsNewModal.waitForDisplay();
  await WhatsNewModal.tapCloseButton();
  await WhatsNewModal.waitForDisappear();
});

When(/^I tap on the Settings tab option$/, async () => {
  await TabBarModal.tapSettingButton();
  await SettingsScreen.waitForDisplay();
});

When(/^I tap on the Activity tab option$/, async () => {
  await TabBarModal.tapActivityButton();
});

When(/^I install upgrade the app$/, async () => {
  await driver.installApp(process.env.BROWSERSTACK_ANDROID_APP_URL)
});

When(/^I scroll up$/, async () => {
  await Gestures.swipeUp(0.5);
});

Then(/^removed test app$/, async () => {
  const platform = await driver.getPlatform();
  // TODO: Use environment variables for bundle IDs
  if (platform === 'iOS') {
    await driver.removeApp('io.metamask.MetaMask-QA');
  }

  if (platform === 'Android') {
    await driver.removeApp('io.metamask.qa');
  }
});


Then(/^I am on the "([^"]*)" account$/, async (accountName) => {
  await CommonScreen.isTextDisplayed(accountName)
});

When(/^I tap on the Identicon$/, async () => {
  await WalletMainScreen.tapIdenticon();
});

Then(/^tokens (.*) in account should be displayed$/, async (token) => {
  await CommonScreen.isTextDisplayed(token)
});

Then(/^I use the back button on Android$/, async () => {
  await driver.back();
});
