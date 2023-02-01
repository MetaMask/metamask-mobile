/* global driver */
import { Then } from '@wdio/cucumber-framework';
import AddressBookModal from '../screen-objects/Modals/AddressBookModal';
import Contacts from '../screen-objects/Contacts';
import AddContact from '../screen-objects/AddContact';

Then(/^I am on the contacts view/, async () => {
  await Contacts.isContactsScreenDisplayed();
});
Then(/^I tap on the "Add contact" button/, async () => {
  await driver.pause(2000);
  await Contacts.tapOnText('Add contact');
});

Then(/^I tap button Add contact which is now enabled/, async () => {
  await Contacts.isAddContactButtonEnabled();
  await AddContact.tapOnAddContactButton();
});

Then(/^I input "([^"]*)?" into the contact name field/, async (name) => {
  await AddContact.fillContactNamefield(name);
});

Then(/^I input "([^"]*)?" in the Address field/, async (name) => {
  await AddContact.fillAddressField(name);
});

Then(/^I tap on contact name "([^"]*)?"/, async (name) => {
  await driver.pause(2500);
  await Contacts.tapOnText(name); // duplicate of line # in the wallet-view.step file
});

Then(/^the saved contact "([^"]*)?" should appear/, async (contactName) => {
  await AddressBookModal.isContactNameVisible(contactName);
});

Then(
  /^the deleted contact "([^"]*)?" should not appear/,
  async (contactName) => {
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
  const timeout = 2000;
  await driver.pause(timeout);
  await Contacts.tapOnEditButton();
});

Then(/I can edit the contact name to "([^"]*)?"/, async (name) => {
  await AddContact.changeContactName(name);
});

Then(
  /^I tap the Edit Contact button which is enabled to confirm the change/,
  async () => {
    await Contacts.tapOnAddContactButton(); // same Id as Edit Contact button
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
