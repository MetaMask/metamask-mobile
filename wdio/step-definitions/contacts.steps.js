import { Given, Then, When } from '@wdio/cucumber-framework';
import AddressBookModal from '../screen-objects/Modals/AddressBookModal';
import Contacts from '../screen-objects/Contacts';
import AddContact from '../screen-objects/AddContact';
import CommonScreen from '../screen-objects/CommonScreen';
import DeleteContactModal from '../screen-objects/Modals/DeleteContactModal';

Then(/^I am on the contacts view/, async () => {
  await Contacts.waitForDisplayed();
});

Then(/^I tap on the "([^"]*)?" button/, async (text) => {
  await CommonScreen.tapOnText(text);
});

Then(/^I tap button Add contact which is now enabled/, async () => {
  await AddContact.tapAddContactButton();
});

Then(/^I input "([^"]*)?" into the contact name field/, async (name) => {
  await AddContact.waitForDisplay();
  await AddContact.fillContactNameField(name);
});

Then(/^I input "([^"]*)?" in the Address field/, async (name) => {
  await AddContact.fillAddressField(name);
});

Then(/^I tap on contact name "([^"]*)?"/, async (name) => {
  await driver.pause(2500);
  await Contacts.tapOnText(name); // duplicate of line # in the wallet-view.step file
});

Then(/^the saved contact "([^"]*)?" should appear/, async (contactName) => {
  await Contacts.waitForDisplayed();
  await AddressBookModal.isContactNameVisible(contactName);
});

Then(
  /^the deleted contact "([^"]*)?" should not appear/,
  async (contactName) => {
    await Contacts.waitForDisplayed();
    await AddressBookModal.isDeletedContactNameNotVisible(contactName);
  },
);

Then(
  /^I have a saved contact "([^"]*)?" on the contacts view/,
  async (name) => {
    await AddressBookModal.isContactNameVisible(name);
  },
);

Then(/I tap on Edit button to edit Saved contact details/, async () => {
  await AddContact.waitForDisplay();
  await AddContact.tapEditButton();
  await AddContact.waitForAddContactButton();
});

Then(/I can edit the contact name to "([^"]*)?"/, async (name) => {
  await AddContact.waitForAddContactButton();
  await AddContact.fillContactNameField(name);
  await driver.hideKeyboard();
});

Then(
  /^I tap the Edit Contact button which is enabled to confirm the change/,
  async () => {
    await AddContact.tapAddContactButton();
  },
);

Then(
  /^I should not see "([^"]*)?" appear in the contact list/,
  async (contactName) => {
    const timeout = 1000;
    await driver.pause(timeout);
    await AddressBookModal.isDeletedContactNameNotVisible(contactName);
  },
);
Given(/^I tap on the Add contact button on the Contact view$/, async () => {
  await Contacts.tapAddContactButton();
});

When(/^I tap button Delete to navigate to Contacts view$/, async () => {
  await AddContact.tapDeleteButton();
  await DeleteContactModal.waitForTitle();
  await DeleteContactModal.tapDeleteButton();
});
