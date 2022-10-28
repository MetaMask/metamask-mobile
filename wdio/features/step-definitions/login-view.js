import { Given, When, Then } from '@wdio/cucumber-framework';
import { dirname } from 'path';
import LoginScreen from '../screen-objects/LoginScreen';

Then(/^Login screen is displayed/, async () => {
    await LoginScreen.isLoginScreenVisible();
});

When(/^I tap Reset Wallet on Login screen/, async () => {
    await LoginScreen.tapResetWallet();
});

When(/^I tap I understand, continue on Delete wallet modal/, async () => {
    await LoginScreen.tapIUnderstandContinue();
});

When(/^I type "([^"]*)?" on Delete wallet modal permanently/, async (text) => {
    await LoginScreen.typedelete(text);
});

When(/^I tap Delete my wallet on Delete wallet modal permanently/, async () => {
    await LoginScreen.tapDeleteMyWallet();
});
