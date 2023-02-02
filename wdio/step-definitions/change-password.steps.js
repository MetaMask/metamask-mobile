import { When, Then } from '@wdio/cucumber-framework';
import Gestures from '../helpers/Gestures';
import ChangePasswordScreens from '../screen-objects/ChangePasswordScreens';
import NetworksScreen from '../screen-objects/NetworksScreen';
import CreateNewWalletScreen from '../screen-objects/Onboarding/CreateNewWalletScreen';
import OnboardingScreen from '../screen-objects/Onboarding/OnboardingScreen';

When(
  /^on Change password screen I input "([^"]*)?" in confirm field/,
  async (text) => {
    const timeout = 1000;
    await driver.pause(timeout);
    await ChangePasswordScreens.typePassword(text);
  },
);
When(/^on Change password screen I tap CONFIRM/, async () => {
  await ChangePasswordScreens.tapCONFIRM();
});
When(
  /^on Reset password screen I input "([^"]*)?" in confirm field/,
  async (text) => {
    await CreateNewWalletScreen.inputConfirmResetPasswordField(text);
    await ChangePasswordScreens.tapUnderstandTerms();
  },
);
When(/^I tap Reset password/, async () => {
    await CreateNewWalletScreen.tapSubmitButton();
});
Then(/^Creating your password is displayed/, async () => {
    await driver.pause(15000);
});
When(/^I navigate to Lock Wallet from Security & Privacy/, async () => {
    await NetworksScreen.tapBackButtonInNewScreen();
    await NetworksScreen.tapBackButtonInSettingsScreen();
    await driver.pause(11111);
});
