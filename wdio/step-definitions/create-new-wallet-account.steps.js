import { Then, When } from '@wdio/cucumber-framework';

import AccountListComponent from '../screen-objects/AccountListComponent';

import WalletAccountModal from '../screen-objects/Modals/WalletAccountModal.js';
import WalletMainScreen from '../screen-objects/WalletMainScreen';
import CommonScreen from '../screen-objects/CommonScreen';

Then(/^I tap on Create a new account/, async () => {
  await AccountListComponent.tapCreateAccountButton();
});

When(/^A new account is created/, async () => {
  await CommonScreen.waitForProgressBarToDisplay();
  await AccountListComponent.isNewAccountCreated();
});

Then(/^I am on the new account/, async () => {
  await WalletMainScreen.tapIdenticon();
  await WalletAccountModal.isAccountNameLabelEqualTo('Account 2'); // this could be better. This stemp could be a bit more dynmic
});
