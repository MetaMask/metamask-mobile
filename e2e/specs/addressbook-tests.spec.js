'use strict';
import { Smoke } from '../tags';

import SendView from '../pages/SendView';

import SettingsView from '../pages/Drawer/Settings/SettingsView';
import ContactsView from '../pages/Drawer/Settings/Contacts/ContactsView';
import AddContactView from '../pages/Drawer/Settings/Contacts/AddContactView';
import TabBarComponent from '../pages/TabBarComponent';
import WalletActionsModal from '../pages/modals/WalletActionsModal';
import AddAddressModal from '../pages/modals/AddAddressModal';

import { CreateNewWallet } from '../viewHelper';

const INVALID_ADDRESS = '0xB8B4EE5B1b693971eB60bDa15211570df2dB221L';
const TETHER_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const MYTH_ADDRESS = '0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6';
const MEMO = 'Test adding ENS';

describe(Smoke('Addressbook Tests'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should create new wallet', async () => {
    await CreateNewWallet();
  });

  it('should go to send view', async () => {
    await TabBarComponent.tapActions();
    await WalletActionsModal.tapSendButton();
    // Make sure view with my accounts visible
    await SendView.isMyAccountsVisisble();
  });

  it('should show invalid address error message', async () => {
    await SendView.inputAddress(TETHER_ADDRESS); //Input token address to test for error
    await SendView.incorrectAddressErrorMessageIsVisible();
    await SendView.removeAddress();
  });

  it('should input a valid address to send to', async () => {
    await SendView.inputAddress(MYTH_ADDRESS);
    await SendView.noEthWarningMessageIsVisible();
  });

  it('should add a new address to address book via send flow', async () => {
    await SendView.tapAddAddressToAddressBook();

    await AddAddressModal.isVisible();
    await AddAddressModal.typeInAlias('Myth');
    await AddAddressModal.tapTitle();
    await AddAddressModal.tapSaveButton();

    await SendView.removeAddress();
    await SendView.isSavedAliasVisible('Myth'); // Check that the new account is on the address list
  });

  it('should go to settings then select contacts', async () => {
    await SendView.tapCancelButton();
    await TabBarComponent.tapSettings();
    await SettingsView.tapContacts();

    await ContactsView.isVisible();
    await ContactsView.isContactAliasVisible('Myth');
  });

  it('should add an address via the contacts view', async () => {
    await ContactsView.tapAddContactButton();

    await AddContactView.isVisible();
    await AddContactView.typeInName('Ibrahim');

    // Input invalid address
    await AddContactView.typeInAddress(INVALID_ADDRESS);
    await AddContactView.isErrorMessageVisible();
    await AddContactView.isErrorMessageTextCorrect();

    await AddContactView.clearAddressInputBox();
    await AddContactView.typeInAddress('ibrahim.team.mask.eth');
    await AddContactView.typeInMemo(MEMO);
    await AddContactView.tapAddContactButton();

    await ContactsView.isVisible(); // Check that we are on the contacts screen
    await ContactsView.isContactAliasVisible('Ibrahim'); // Check that Ibrahim address is saved in the address book
  });

  it('should edit a contact', async () => {
    await ContactsView.tapOnAlias('Myth'); // Tap on Myth address

    await AddContactView.tapEditButton();
    await AddContactView.typeInName('Moon'); // Change name from Myth to Moon
    await AddContactView.tapEditContactCTA();

    // because tapping edit contact is slow to load on bitrise
    try {
      await ContactsView.isVisible();
    } catch {
      await AddContactView.tapEditContactCTA();
      await ContactsView.isVisible();
    }
    await ContactsView.isContactAliasVisible('Moon'); // Check that Ibrahim address is saved in the address book
    await ContactsView.isContactAliasNotVisible('Myth'); // Ensure Myth is not visible
  });

  it('should remove a contact', async () => {
    // Tap on Moon address
    await ContactsView.tapOnAlias('Moon'); // Tap on Myth address
    // Tap on edit
    await AddContactView.tapEditButton();
    await AddContactView.tapDeleteContactCTA();

    await ContactsView.isContactAliasNotVisible('Moon');
  });

  it('should go back to send flow to validate newly added address is displayed', async () => {
    // tap on the back arrow
    await AddContactView.tapBackButton();
    await TabBarComponent.tapWallet();

    await TabBarComponent.tapActions();
    await WalletActionsModal.tapSendButton();

    await SendView.isSavedAliasVisible('Ibrahim');
  });
});
