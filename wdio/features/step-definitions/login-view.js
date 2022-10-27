import { Given, When, Then } from '@wdio/cucumber-framework';
import LoginScreen from '../screen-objects/LoginScreen';

Then(/^Login screen is displayed/, async () => {
    await LoginScreen.isLoginScreenVisible();
    await driver.pause(2000);
});

When(/^I tap Reset Wallet on Login screen/, async () => {
    await LoginScreen.tapResetWallet();
});

When(/^I tap "([^"]*)?" on Delete wallet modal/, async (text) => {
    console.log(`## tap on ${text}`);
    await LoginScreen.tapIUnderstandContinue();
    await driver.pause(5000);
});
