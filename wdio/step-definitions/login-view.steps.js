import { Given, When, Then } from '@wdio/cucumber-framework';
import { dirname } from 'path';
import LoginScreen from '../screen-objects/LoginScreen';

Then(/^Login screen is displayed/, async () => {
  await LoginScreen.isLoginScreenVisible();
});

When(/^I tap Reset Wallet on Login screen/, async () => {
  await LoginScreen.tapResetWalletButton();
});
