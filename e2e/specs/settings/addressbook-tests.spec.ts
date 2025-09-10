import { RegressionWalletPlatform } from '../../tags';
import SendView from '../../pages/Send/SendView';
import SettingsView from '../../pages/Settings/SettingsView';
import ContactsView from '../../pages/Settings/Contacts/ContactsView';
import AddContactView from '../../pages/Settings/Contacts/AddContactView';
import AddAddressModal from '../../pages/Send/AddAddressModal';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletView from '../../pages/wallet/WalletView';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import CommonView from '../../pages/CommonView';
import enContent from '../../../locales/languages/en.json';
import DeleteContactBottomSheet from '../../pages/Settings/Contacts/DeleteContactBottomSheet';
import Assertions from '../../framework/Assertions';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';

const INVALID_ADDRESS = '0xB8B4EE5B1b693971eB60bDa15211570df2dB221L';
const TETHER_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const MYTH_ADDRESS = '0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6';
const TEST_CONTACT = {
  address: '0x90aF68e1ec406e77C2EA0E4e6EAc9475062d6456',
  name: 'My Contact',
  editedName: 'My edited contact',
  network: 'Linea Main Network',
  editedNetwork: 'Sepolia',
};
const MEMO = 'Test adding ENS';

describe(RegressionWalletPlatform('Addressbook Tests'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should add a contact via send flow and go to contacts view', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withProfileSyncingDisabled().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer) => {
          await setupRemoteFeatureFlagsMock(mockServer, {
            sendRedesign: {
              enabled: false,
            },
          });
        },
      },
      async () => {
        await loginToApp();
        await WalletView.tapWalletSendButton();
        // Make sure view with my accounts visible
        await Assertions.expectElementToBeVisible(
          SendView.CurrentAccountElement,
        );

        // should input a valid address to send to
        await SendView.inputAddress(MYTH_ADDRESS);
        await Assertions.expectElementToBeVisible(SendView.zeroBalanceWarning);

        // should add a new address to address book via send flow
        await SendView.tapAddAddressToAddressBook();
        await Assertions.expectElementToBeVisible(AddAddressModal.container);
        await AddAddressModal.typeInAlias('Myth');
        await AddAddressModal.tapTitle();
        await AddAddressModal.tapSaveButton();
        await SendView.removeAddress();
        await Assertions.expectTextDisplayed('Myth');

        // should go to settings then select contacts
        await SendView.tapCancelButton();
        await TabBarComponent.tapSettings();
        await SettingsView.tapContacts();
        await Assertions.expectElementToBeVisible(ContactsView.container);
        await ContactsView.expectContactIsVisible('Myth');
      },
    );
  });

  it('should show invalid address error message on send flow', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withProfileSyncingDisabled().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer) => {
          await setupRemoteFeatureFlagsMock(mockServer, {
            sendRedesign: {
              enabled: false,
            },
          });
        },
      },
      async () => {
        await loginToApp();
        await WalletView.tapWalletSendButton();
        await SendView.inputAddress(TETHER_ADDRESS); //Input token address to test for error
        await Assertions.expectElementToBeVisible(SendView.contractWarning);
        await SendView.removeAddress();
      },
    );
  });

  it('should add an address via the contacts view and edit it', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withProfileSyncingDisabled().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer) => {
          await setupRemoteFeatureFlagsMock(mockServer, {
            sendRedesign: {
              enabled: false,
            },
          });
        },
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapSettings();
        await SettingsView.tapContacts();
        await ContactsView.tapAddContactButton();
        await Assertions.expectElementToBeVisible(AddContactView.container);
        await AddContactView.typeInName('Ibrahim');
        // Input invalid address
        await AddContactView.typeInAddress(INVALID_ADDRESS);
        await Assertions.expectElementToBeVisible(CommonView.errorMessage);
        await Assertions.expectElementToHaveText(
          CommonView.errorMessage,
          enContent.transaction.invalid_address,
        );
        await AddContactView.clearAddressInputBox();
        await AddContactView.typeInAddress('ibrahim.team.mask.eth');
        await AddContactView.typeInMemo(MEMO);
        await AddContactView.tapAddContactButton();
        await Assertions.expectElementToBeVisible(ContactsView.container);
        await ContactsView.expectContactIsVisible('Ibrahim'); // Check that Ibrahim address is saved in the address book

        // should edit a contact
        await ContactsView.tapOnAlias('Ibrahim');
        await AddContactView.tapEditButton();
        await AddContactView.typeInName('Ibrahim edited'); // Change name from Ibrahim to Ibrahim edited

        await AddContactView.tapEditContactCTA();
        await ContactsView.expectContactIsVisible('Ibrahim edited'); // Check that Ibrahim address is saved in the address book
        await ContactsView.expectContactIsNotVisible('Ibrahim'); // Ensure Ibrahim is not visible

        // should go back to send flow to validate newly added address is displayed
        await CommonView.tapBackButton();
        await TabBarComponent.tapWallet();
        await WalletView.tapWalletSendButton();
        await Assertions.expectTextDisplayed('Ibrahim edited');
      },
    );
  });

  it('should add a contact with a different network', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withProfileSyncingDisabled().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer) => {
          await setupRemoteFeatureFlagsMock(mockServer, {
            sendRedesign: {
              enabled: false,
            },
          });
        },
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapSettings();
        await SettingsView.tapContacts();
        await ContactsView.tapAddContactButton();
        await Assertions.expectElementToBeVisible(AddContactView.container);
        await AddContactView.typeInName(TEST_CONTACT.name);
        await AddContactView.typeInAddress(TEST_CONTACT.address);
        await AddContactView.selectNetwork(TEST_CONTACT.network);
        await Assertions.expectElementToBeVisible(AddContactView.container);
        await AddContactView.tapAddContactButton();
        await Assertions.expectElementToBeVisible(ContactsView.container);
        // This should not be visible if MM_REMOVE_GLOBAL_NETWORK_SELECTOR is disabled
        await ContactsView.expectContactIsVisible(TEST_CONTACT.name);

        // should edit a contact with a different network
        await ContactsView.tapOnAlias(TEST_CONTACT.name);
        await AddContactView.tapEditButton();
        await AddContactView.typeInName(TEST_CONTACT.editedName);
        await AddContactView.selectNetwork(TEST_CONTACT.editedNetwork);
        await AddContactView.tapEditContactCTA();
        await Assertions.expectElementToBeVisible(ContactsView.container);
        // This should not be visible if MM_REMOVE_GLOBAL_NETWORK_SELECTOR is disabled
        await ContactsView.expectContactIsVisible(TEST_CONTACT.editedName);
        await ContactsView.expectContactIsNotVisible(TEST_CONTACT.name);

        // should display all EVM contacts in the send flow
        await TabBarComponent.tapWallet();
        await WalletView.tapWalletSendButton();
        await SendView.inputAddress(TEST_CONTACT.editedName[0]);
        await Assertions.expectTextDisplayed(TEST_CONTACT.editedName, {
          allowDuplicates: true,
        });
        await SendView.tapCancelButton();

        // should remove a contact
        // Tap on Moon address
        await TabBarComponent.tapSettings();
        await SettingsView.tapContacts();
        await ContactsView.tapOnAlias(TEST_CONTACT.editedName);

        // Tap on edit
        await AddContactView.tapEditButton();
        await AddContactView.tapDeleteContactCTA();
        await Assertions.expectElementToBeVisible(
          DeleteContactBottomSheet.title,
        );
        await DeleteContactBottomSheet.tapDeleteButton();
        await ContactsView.expectContactIsNotVisible(TEST_CONTACT.editedName);
      },
    );
  });
});
