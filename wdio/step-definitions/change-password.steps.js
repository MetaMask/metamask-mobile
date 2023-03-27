/* eslint-disable no-undef */
import { When, Then } from '@wdio/cucumber-framework';
import ChangePasswordScreens from '../screen-objects/ChangePasswordScreens';
import CreateNewWalletScreen from '../screen-objects/Onboarding/CreateNewWalletScreen';
import SecurityAndPrivacyScreen from '../screen-objects/SecurityAndPrivacyScreen';

When(
  /^on Change password screen I input "([^"]*)?" in confirm field/,
  async (text) => {
    const timeout = 1000;
    await driver.pause(timeout);
    await ChangePasswordScreens.typePassword(text);
  },
);
When(/^on Change password screen I tap CONFIRM/, async () => {
  await ChangePasswordScreens.tapConfirmButton();
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
Then(/^Creating password is displayed/, async () => {
  await driver.pause(1000);
  await SecurityAndPrivacyScreen.isChangePasswordTextVisible('Creating password...');
  await driver.pause(8000);
});
