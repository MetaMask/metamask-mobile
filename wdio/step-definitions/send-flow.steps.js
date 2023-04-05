// eslint-disable-next-line no-unused-vars
/* global driver */
import { Given, Then, When } from '@wdio/cucumber-framework';
import SendScreen from '../screen-objects/SendScreen';
import AddressBookModal from '../screen-objects/Modals/AddressBookModal';
import AmountScreen from '../screen-objects/AmountScreen';
import WalletMainScreen from '../screen-objects/WalletMainScreen';
import TokenOverviewScreen from '../screen-objects/TokenOverviewScreen';
import TransactionConfirmScreen from '../screen-objects/TransactionConfirmScreen';

Then(/^On the Address book modal Cancel button is enabled/, async () => {
  await AddressBookModal.isCancelButtonEnabled();
});

Then(/^I see a Save button which is disabled/, async () => {
  await AddressBookModal.isSaveButtonDisabled();
});

Then(/^I enter in a contact name "([^"]*)?"/, async (text) => {
  await AddressBookModal.fillAddressAliasField(text);
});

Then(/^the Save button becomes enabled/, async () => {
  await AddressBookModal.isSaveButtonEnabled();
});

Then(/^I tap the Save button/, async () => {
  await AddressBookModal.tapOnSaveButton();
});

Given(
  /^I enter address "([^"]*)?" in the sender's input box/,
  async (address) => {
    await SendScreen.typeAddressInSendAddressField(address);
  },
);

Given(/^I should see a warning message "([^"]*)?"/, async (message) => {
  await SendScreen.isSendWarningMessageVisible(message);
});

When(/^I see a button with text "([^"]*)?"/, async (text) => {
  await SendScreen.isTextVisible(text);
});

Then(/^I proceed to the amount view/, async () => {
  await SendScreen.isAmountScreenDisplayed();
});

Then(/^I should be taken to the transaction confirmation view/, async () => {
  await TransactionConfirmScreen.isConfirmScreenVisible();
});

Then(/^the token (.*) being sent is visible/, async (token) => {
  await TransactionConfirmScreen.isCorrectTokenConfirm(token);
});

Then(/^the token amount (.*) to be sent is visible/, async (amount) => {
  await TransactionConfirmScreen.isCorrectTokenAmountDisplayed(amount);
});

Then(
  /^the contact name "([^"]*)?" appears in the senders input box above the contact address/,
  async (contactName) => {
    await SendScreen.isContactNameVisible(contactName);
  },
);

Then(/^I navigate to the main wallet screen/, async () => {
  await SendScreen.tapCancelButton();
});

Then(
  /^I should see the edited name "([^"]*)?" contact under Recents on the send screen/,
  async (name) => {
    await SendScreen.isChangedContactNameVisible(name);
  },
);

Then(/^I navigate to the main wallet view from Send screen/, async () => {
  await SendScreen.tapCancelButton();
});

Then(
  /^I go back to the main wallet screen from the send flow screen/,
  async () => {
    await SendScreen.tapCancelButton();
  },
);

Then(/^I navigate back to main wallet screen/, async () => {
  await SendScreen.tapCancelButton();
});

Then(
  /^I enter invalid address "([^"]*)?" into senders input field/,
  async (address) => {
    await SendScreen.typeAddressInSendAddressField(address);
  },
);

Then(/^I type amount "([^"]*)?" into amount input field/, async (amount) => {
  await AmountScreen.enterAmount(amount);
});

Then(
  /^the transaction is submitted with Transaction Complete! toast/,
  async () => {
    await WalletMainScreen.isToastNotificationDisplayed();
  },
);

Then(/^I am taken to the token overview screen/, async () => {
  await TokenOverviewScreen.isTokenOverviewVisible();
});

Then(/^I tap back from the Token overview page/, async () => {
  await TokenOverviewScreen.tapBackButton();
});
When(/^I tap button Send on Token screen view$/, async () => {
  await TokenOverviewScreen.tapSendButton();
});
