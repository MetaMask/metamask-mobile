// eslint-disable-next-line no-unused-vars
/* global driver */
import { Given, When, Then } from '@wdio/cucumber-framework';
import SendScreen from '../screen-objects/SendScreen';
import AddressBook from '../screen-objects/AddressBook';
import Contacts from '../screen-objects/Contacts';
import Gestures from '../helpers/Gestures';

Given(/^I enter address "([^"]*)?" in the sender's input box/, async (address) => {
    await SendScreen.typeAddressInSendAddressField(address);
});

Given(/^I should see a warning message "([^"]*)?"/, async (message) => {
    await SendScreen.isSendWarningMessageVisible(message);
});

When(/^I see a button with text "([^"]*)?"/, async (text) => {
    await SendScreen.isTextVisible(text);
});

Then(/^I tap on button with text "([^"]*)?"/, async (text) => {
    const timeout = 4000;
    await driver.pause(timeout);
    // await SendScreen.tapOnText(text);
    await Gestures.tapTextByXpath(text, 'LONGPRESS');
});

Then(/^I proceed to the amount view/, async () => {
    await SendScreen.isAmountScreenDisplayed();
});

Then(/^I am on the wallet view/, async () => {
    await SendScreen.tapCancelButton();
});

Then(/^On the Address book modal Cancel button is enabled/, async () => {
    await AddressBook.isCancelButtonEnabled();
});

Then(/^I see a Save button which is disabled/, async () => {
    await AddressBook.isSaveButtonDisabled();
});

Then(/^I enter in a contact name "([^"]*)?"/, async (text) => {
    await AddressBook.fillAddressAliasField(text);
});

Then(/^the Save button becomes enabled/, async () => {
    await AddressBook.isSaveButtonEnabled();
});

Then(/^I tap the Save button/, async () => {
    await AddressBook.tapOnSaveButton();
});

Then(/^the contact name "([^"]*)?" appears in the senders input box above the contact address/, async (contactName) => {
    await AddressBook.isContactNameVisible(contactName);
});

Then(/^I navigate to the main wallet screen/, async () => {
    await SendScreen.tapCancelButton();
});

Then(/^the saved contact "([^"]*)?" should appear/, async (contactName) => {
    await AddressBook.isContactNameVisible(contactName);
});

Then(/^the deleted contact "([^"]*)?" should not appear/, async (contactName) => {
    await AddressBook.isDeletedContactNameNotVisible(contactName);
});

Then(/^I am on the contacts view/, async () => {
    await Contacts.isContactsScreenDisplayed();
});

Then(/^I tap button "([^"]*)?" which is now enabled/, async (text) => {
    await driver.pause(2000); 
    await Contacts.isAddContactButtonEnabled();
    await Contacts.tapOnAddContactButton();
});

Then(/^I input "([^"]*)?" into the contact name field/, async (name) => {
    await Contacts.fillContactNamefield(name);
});

Then(/^I input "([^"]*)?" in the Address field/, async (name) => {
    await Contacts.fillAddressField(name);
});

Then(/^I have a saved contact "([^"]*)?" on the contacts view/, async (name) => {
    await AddressBook.isContactNameVisible(name);
});

Then(/^I tap on contact name "([^"]*)?"/, async (name) => {
    await Contacts.tapOnText(name);
});

Then(/I tap on Edit button to edit Saved contact details/, async () => {
    const timeout = 2000;
    await driver.pause(timeout);
    await Contacts.tapOnEditButton();
});

Then(/I can edit the contact name to "([^"]*)?"/, async (name) => {
    await Contacts.changeContactName(name);
});

Then(/^I tap the Edit Contact button which is enabled to confirm the change/, async () => {
    await Contacts.tapOnAddContactButton();// same Id as Edit Contact button
});

Then(/^I return to the send flow/, async (text) => {
    await Contacts.isAddContactButtonEnabled();
     await Contacts.tapOnAddContactButton();
});

Then(/^I should see the edited name "([^"]*)?" contact under Recents on the send screen/, async (name) => {
    await SendScreen.isChangedContactNameVisible(name);
});

Then(/^I navigate to the main wallet view from Send screen/, async () => {
    await SendScreen.tapCancelButton();
});

Then(/^I should not see "([^"]*)?" appear in the contact list/, async (contactName) => {
    const timeout = 1000;
    await driver.pause(timeout);
    await AddressBook.isDeletedContactNameNotVisible(contactName);
});

Then(/^I go back to the main wallet screen from the send flow screen/, async () => {
    await SendScreen.tapCancelButton();
});

Then(/^I navigate back to main wallet screen/, async () => {
    await SendScreen.tapCancelButton();
});

Then(/^On the Main Wallet view I tap "([^"]*)?"/, async (text) => {
    const timeout = 1500;
    await driver.pause(timeout);
    await SendScreen.tapOnText(text);
});

Then(/^I enter invalid address "([^"]*)?" into senders input field/, async (address) => {
    await SendScreen.typeAddressInSendAddressField(address);
});



