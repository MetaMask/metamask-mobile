import { Given, Then, When } from '@wdio/cucumber-framework';

import AccountListComponent from '../screen-objects/AccountListComponent';

import AddCustomImportTokensScreen from '../screen-objects/AddCustomImportTokensScreen.js';

import WalletAccountModal from '../screen-objects/Modals/WalletAccountModal.js';
import WalletMainScreen from "../screen-objects/WalletMainScreen";

Then(/^I tap on Create a new account/, async () => {
  await AccountListComponent.tapCreateAccountButton();
});

When(/^A new account is created/, async () => {
  await AccountListComponent.isAccountTwoSelected();
});

Then(/^I am on the new account/, async () => {
  await WalletMainScreen.tapIdenticon();
  await AccountListComponent.isComponentNotDisplayed();
  await WalletAccountModal.isAccountNameLabelEqualTo('Account 2');
});
