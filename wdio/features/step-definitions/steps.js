const { Given, When, Then } = require('@wdio/cucumber-framework');

const DemoPage = require('../pageobjects/login.page');
const SettingsPage = require('../pageobjects/ios/settings.page');

const pages = {
    demo: DemoPage
}

Given(/^I am on the demo page/, async () => {
    // await driver.launchApp();
    await driver.switchContext('NATIVE_APP');
    await driver.pause(3000);
});

When(/^I input (.*) in textfield$/, async (input) => {
    await DemoPage.setmessage(input);
});

Then(/^I should see (.*) in textfield$/, async (message) => {
    await DemoPage.verifymessage(message);
});

Given(/^I launch the settings app of iphone$/, async () => {
    await driver.switchContext('NATIVE_APP');
    await driver.pause(3000);
});

Then(/^I should see the general label$/, async () => {
    await SettingsPage.verifyGeneralLabel();
});