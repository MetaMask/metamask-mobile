import {Given, Then, When} from '@wdio/cucumber-framework';

import AccountListComponent from '../screen-objects/AccountListComponent';

import AddCustomImportTokensScreen from '../screen-objects/AddCustomImportTokensScreen.js';
import WalletMainScreen from '../screen-objects/WalletMainScreen.js';


When(/^I tap on the Identicon/, async () => { // should be in a commons-step file
  await driver.pause(setTimeout);
  await WalletMainScreen.tapIdenticon();
});

When(/^the account list should be visible/, async () => { // should be in a common-step file
  await driver.pause(3000);
  await AccountListComponent.isVisible();
});

Then(/^I tap on Create a new account/, async () => {
  await AccountListComponent.tapCreateAccountButton();
});

When(/^A new account is created/, async () => {
  await driver.pause(2000);
  await AddCustomImportTokensScreen.tapImportButton();
});

Then(/^I am on the new account/, async () => {
  await driver.pause(2500);
  WalletMainScreen.isAccountNameLabelEqualTo('Account 2'); // this can be better
});
Then(/^I dismiss the account list/, async () => {
  await driver.pause(2500);
  await driver.touchPerform([{action: 'tap', options: {x: 100, y: 200}}]);
});
