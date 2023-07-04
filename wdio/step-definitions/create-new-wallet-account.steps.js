import { Then, When } from '@wdio/cucumber-framework';

import AccountListComponent from '../screen-objects/AccountListComponent';

import WalletAccountModal from '../screen-objects/Modals/WalletAccountModal.js';
import CommonScreen from '../screen-objects/CommonScreen';
import AddAccountModal from '../screen-objects/Modals/AddAccountModal';

Then(/^I tap Create a new account/, async () => {
  await AccountListComponent.tapAddAccountButton();
  await AddAccountModal.tapNewAccountButton();
});

When(/^A new account is created/, async () => {
  await CommonScreen.waitForProgressBarToDisplay();
});

Then(/^I am on the new account/, async () => {
  await CommonScreen.tapOnText('Account 2');
  await AccountListComponent.isComponentNotDisplayed();
  await WalletAccountModal.isAccountNameLabelEqualTo('Account 2');
});
