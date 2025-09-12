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
import { Mockttp } from 'mockttp';
import { setupMockPostRequest } from '../../api-mocking/helpers/mockHelpers';

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

const infuraUrlEndpoint = /^https:\/\/mainnet\.infura\.io\/v3\/.*$/;

const testSpecificMock = async (mockServer: Mockttp) => {
  // Mock eth_blockNumber
  await setupMockPostRequest(
    mockServer,
    infuraUrlEndpoint,
    {
      jsonrpc: '2.0',
      id: 2470556049218,
      method: 'eth_blockNumber',
      params: [],
    },
    {
      jsonrpc: '2.0',
      id: 1111111111111111,
      result: '0x1',
    },
    { statusCode: 200, ignoreFields: ['id'], priority: 100 },
  );

  // Mock eth_call for ENS resolution
  await setupMockPostRequest(
    mockServer,
    infuraUrlEndpoint,
    {
      jsonrpc: '2.0',
      id: 2470556049218,
      method: 'eth_call',
      params: [
        {
          to: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
          data: '0x0178b8bf62f5cd80e869a3e6f26adda90ee5c5de51733e083613cfc0df8f03838e51a5d1',
        },
        '0x1',
      ],
    },
    {
      jsonrpc: '2.0',
      id: 2470556049218,
      result:
        '0x000000000000000000000000226159d592e2b063810a10ebf6dcbada94ed68b8',
    },
    { statusCode: 200, ignoreFields: ['id'], priority: 101 },
  );

  // Mock eth_call for name resolution
  await setupMockPostRequest(
    mockServer,
    infuraUrlEndpoint,
    {
      jsonrpc: '2.0',
      id: 2470556049218,
      method: 'eth_call',
      params: [
        {
          to: '0x226159d592e2b063810a10ebf6dcbada94ed68b8',
          data: '0x3b3b57de62f5cd80e869a3e6f26adda90ee5c5de51733e083613cfc0df8f03838e51a5d1',
        },
        '0x1',
      ],
    },
    {
      jsonrpc: '2.0',
      id: 2470556049219,
      result:
        '0x00000000000000000000000045cf837b0bd8a9bf527ee36803026fe51b63e69a',
    },
    {
      statusCode: 200,
      ignoreFields: ['id'],
      priority: 102,
    },
  );

  // Mock eth_call for multicall
  await setupMockPostRequest(
    mockServer,
    infuraUrlEndpoint,
    {
      jsonrpc: '2.0',
      id: 2470556049219,
      method: 'eth_call',
      params: [
        {
          to: '0xca11bde05977b3631167028862be2a173976ca11',
          data: '0xbce38bd700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000020000000000000000000000000004fef9d741011476750a243ac70b9789a63dd47df00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000024f04da65b00000000000000000000000076cf1cdd1fcc252442b50d6e97207228aa4aefc300000000000000000000000000000000000000000000000000000000',
        },
        '0x1',
      ],
    },
    {
      jsonrpc: '2.0',
      id: '547b6502-63ae-4d61-9a47-67c43bfe37f8',
      result:
        '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000',
    },
    { statusCode: 200, ignoreFields: ['id'], priority: 103 },
  );

  // Mock eth_call for additional data
  await setupMockPostRequest(
    mockServer,
    infuraUrlEndpoint,
    {
      jsonrpc: '2.0',
      id: 2470556049220,
      method: 'eth_call',
      params: [
        {
          to: '0xb1f8e55c7f64d203c1400b9d8555d050f94adf39',
          data: '0xf0002ea900000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000100000000000000000000000076cf1cdd1fcc252442b50d6e97207228aa4aefc300000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000',
        },
        '0x1',
      ],
    },
    {
      jsonrpc: '2.0',
      id: '14762501-d530-4918-9e77-3ff229104699',
      result:
        '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000',
    },
    { statusCode: 200, ignoreFields: ['id'], priority: 104 },
  );

  // Mock eth_call for token symbol
  await setupMockPostRequest(
    mockServer,
    infuraUrlEndpoint,
    {
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [
        {
          to: '0xdac17f958d2ee523a2206206994597c13d831ec7',
          data: '0x95d89b41',
        },
        '0x1',
      ],
    },
    {
      jsonrpc: '2.0',
      id: '547b6502-63ae-4d61-9a47-67c43bfe37f8',
      result:
        '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000045553445400000000000000000000000000000000000000000000000000000000',
    },
    { statusCode: 200, ignoreFields: ['id'], priority: 105 },
  );
};

describe(RegressionWalletPlatform('Addressbook Tests'), () => {
  // In this file, some of the tests are dependent on the MM_REMOVE_GLOBAL_NETWORK_SELECTOR environment variable being set to true.
  const isRemoveGlobalNetworkSelectorEnabled =
    process.env.MM_REMOVE_GLOBAL_NETWORK_SELECTOR === 'true';
  const itif = (condition: boolean) => (condition ? it.only : it.skip);

  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should add a contact via send flow and go to contacts view', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withProfileSyncingDisabled().build(),
        restartDevice: true,
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
        testSpecificMock,
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
        testSpecificMock,
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

  itif(isRemoveGlobalNetworkSelectorEnabled)(
    'should add a contact with a different network',
    async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().withProfileSyncingDisabled().build(),
          restartDevice: true,
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
    },
  );
});
