// eslint-disable-next-line no-unused-vars
/* global driver */
import { Given, When, Then } from '@wdio/cucumber-framework';
import SendScreen from '../screen-objects/SendScreen';
import AddressBookModal from '../screen-objects/Modals/AddressBookModal';

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
