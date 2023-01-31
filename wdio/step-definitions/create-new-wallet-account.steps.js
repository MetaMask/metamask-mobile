import { Given, Then, When } from '@wdio/cucumber-framework';

import AccountListComponent from '../screen-objects/AccountListComponent';

import AddCustomImportTokensScreen from '../screen-objects/AddCustomImportTokensScreen.js';

import WalletAccountModal from '../screen-objects/Modals/WalletAccountModal.js';

Then(/^I tap on Create a new account/, async () => {
  await AccountListComponent.tapCreateAccountButton();
});

When(/^A new account is created/, async () => {
  await driver.pause(2000);
  await AddCustomImportTokensScreen.tapImportButton();
});

Then(/^I am on the new account/, async () => {
  await driver.pause(2500);
  WalletAccountModal.isAccountNameLabelEqualTo('Account 2'); // this can be better
});
