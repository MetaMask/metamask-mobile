import { When, Then } from '@wdio/cucumber-framework';
import AddCustomImportTokensScreen from '../screen-objects/AddCustomImportTokensScreen.js';
import WalletMainScreen from '../screen-objects/WalletMainScreen.js';

let setTimeout = 1500; //added to run on physical device

When(/^I type (.*) into token Address field/, async (address) => {
  await driver.pause(setTimeout); //added to run on physical device
  await AddCustomImportTokensScreen.typeCustomTokenAddress(address);
});

When(/^I tap (.*) of the token Address field/, async (label) => {
  await driver.pause(3000); //added to run on physical device
  await AddCustomImportTokensScreen.tapTokenSymbolField();
});

Then(/^The Token Symbol is displayed/, async () => {
  await AddCustomImportTokensScreen.tapTokenSymbolFieldAndDismissKeyboard();
});

When(/^I tap on the Import button/, async () => {
  await driver.pause(2000); //added to run on physical device
  await AddCustomImportTokensScreen.tapImportButton();
});

Then(/^I should see "([^"]*)?" toast message/, async (toast) => {
  await WalletMainScreen.isTokenTextVisible(toast);
});
