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
});

Then(/^I am on the new account/, async () => {
  await CommonScreen.tapOnText('Account 2');
  await WalletMainScreen.tapIdenticon();
  await AccountListComponent.isComponentNotDisplayed();
  await WalletAccountModal.isAccountNameLabelEqualTo('Account 2');
});
