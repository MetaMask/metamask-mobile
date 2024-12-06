'use strict';
import { SmokeCore } from '../../tags';
import SendView from '../../pages/Send/SendView';
import SettingsView from '../../pages/Settings/SettingsView';
import ContactsView from '../../pages/Settings/Contacts/ContactsView';
import AddContactView from '../../pages/Settings/Contacts/AddContactView';
import AddAddressModal from '../../pages/Send/AddAddressModal';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import TestHelpers from '../../helpers';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';
import CommonView from '../../pages/CommonView';
import enContent from '../../../locales/languages/en.json';
import DeleteContactBottomSheet from '../../pages/Settings/Contacts/DeleteContactBottomSheet';
import Assertions from '../../utils/Assertions';

const INVALID_ADDRESS = '0xB8B4EE5B1b693971eB60bDa15211570df2dB221L';
const TETHER_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const MYTH_ADDRESS = '0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6';
const MEMO = 'Test adding ENS';
const fixtureServer = new FixtureServer();

describe(SmokeCore('Addressbook Tests'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  beforeEach(() => {
    jest.setTimeout(150000);
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  it('should go to send view', async () => {
    await TabBarComponent.tapActions();
    await WalletActionsBottomSheet.tapSendButton();
    // Make sure view with my accounts visible
    await Assertions.checkIfVisible(SendView.CurrentAccountElement);
  });

  it('should show invalid address error message', async () => {
    await SendView.inputAddress(TETHER_ADDRESS); //Input token address to test for error

    await Assertions.checkIfVisible(SendView.contractWarning);

    await SendView.removeAddress();
  });

  it('should input a valid address to send to', async () => {
    await SendView.inputAddress(MYTH_ADDRESS);
    await Assertions.checkIfVisible(SendView.zeroBalanceWarning);
  });

  it('should add a new address to address book via send flow', async () => {
    await SendView.tapAddAddressToAddressBook();
    await Assertions.checkIfVisible(AddAddressModal.container);
    await AddAddressModal.typeInAlias('Myth');
    await AddAddressModal.tapTitle();
    await AddAddressModal.tapSaveButton();
    await SendView.removeAddress();
    await Assertions.checkIfTextIsDisplayed('Myth');
  });

  it('should go to settings then select contacts', async () => {
    await SendView.tapCancelButton();
    await TabBarComponent.tapSettings();
    await SettingsView.tapContacts();
    await Assertions.checkIfVisible(ContactsView.container);
    await ContactsView.isContactAliasVisible('Myth');
  });

  it('should add an address via the contacts view', async () => {
    await ContactsView.tapAddContactButton();
    await Assertions.checkIfVisible(AddContactView.container);
    await AddContactView.typeInName('Ibrahim');
    // Input invalid address
    await AddContactView.typeInAddress(INVALID_ADDRESS);
    await Assertions.checkIfVisible(CommonView.errorMessage);
    await Assertions.checkIfElementToHaveText(
      CommonView.errorMessage,
      enContent.transaction.invalid_address,
    );
    await AddContactView.clearAddressInputBox();
    await AddContactView.typeInAddress('ibrahim.team.mask.eth');
    await AddContactView.typeInMemo(MEMO);
    await AddContactView.tapAddContactButton();
    await Assertions.checkIfVisible(ContactsView.container);
    await ContactsView.isContactAliasVisible('Ibrahim'); // Check that Ibrahim address is saved in the address book
  });

  it('should edit a contact', async () => {
    await ContactsView.tapOnAlias('Myth'); // Tap on Myth address
    await AddContactView.tapEditButton();
    await AddContactView.typeInName('Moon'); // Change name from Myth to Moon
    await AddContactView.tapEditContactCTA();

    // because tapping edit contact is slow to load on bitrise
    try {
      await Assertions.checkIfVisible(ContactsView.container);
    } catch {
      await AddContactView.tapEditContactCTA();
      await Assertions.checkIfVisible(ContactsView.container);
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
    await Assertions.checkIfVisible(DeleteContactBottomSheet.title);
    await DeleteContactBottomSheet.tapDeleteButton();
    await ContactsView.isContactAliasNotVisible('Moon');
  });

  it('should go back to send flow to validate newly added address is displayed', async () => {
    // tap on the back arrow
    await CommonView.tapBackButton();
    await TabBarComponent.tapWallet();
    await TabBarComponent.tapActions();
    await WalletActionsBottomSheet.tapSendButton();
    await Assertions.checkIfTextIsDisplayed('Ibrahim');
  });
});
