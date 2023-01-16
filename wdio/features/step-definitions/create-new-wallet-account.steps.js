/* global driver */

import {Given, Then, When} from '@wdio/cucumber-framework';

import AccountListComponent from '../screen-objects/AccountListComponent';

import AddCustomImportTokensScreen from '../screen-objects/AddCustomImportTokensScreen.js';
import WalletMainScreen from '../screen-objects/WalletMainScreen.js';



import WalletAccountModal from '../screen-objects/Modals/WalletAccountModal.js';


When(/^I tap on the Identicon/, async () => { // should be in a commons-step file
  await driver.pause(setTimeout);
  await WalletMainScreen.tapIdenticon();
});

When(/^the account list should be visible/, async () => { // should be in a common-step file
  const setTimeOut = 3000;
  await driver.pause(setTimeOut);
  await AccountListComponent.isVisible();
});

Then(/^I tap on Create a new account/, async () => {
  await AccountListComponent.tapCreateAccountButton();
});

When(/^A new account is created/, async () => {
  const setTimeOut = 2000;
  await driver.pause(setTimeOut);
  await AddCustomImportTokensScreen.tapImportButton();
});

Then(/^I am on the new account/, async () => {
  const setTimeOut = 2500;
  await driver.pause(setTimeOut);
  WalletAccountModal.isAccountNameLabelEqualTo('Account 2'); // this can be better
});

Then(/^Account named "([^"]*)?" is created/, async (contactName) => {
  await AccountListComponent.isNewAccountDisplayed(contactName);

});

Then(/^I dismiss the account list/, async () => {
  const setTimeOut = 2500;
  await driver.pause(setTimeOut);
  await driver.touchPerform([{action: 'tap', options: {x: 100, y: 200}}]);
});

Then(/^the account name on main wallet screen should now read "([^"]*)"$/, async (text) => {
  await WalletAccountModal.isAccountNameEqualTo(text);
});