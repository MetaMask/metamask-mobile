import { RegressionWalletPlatform } from '../../tags';
import SendView from '../../pages/Send/SendView';
import AddAddressModal from '../../pages/Send/AddAddressModal';
import WalletView from '../../pages/wallet/WalletView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView';
import ContactsView from '../../pages/Settings/Contacts/ContactsView';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import Assertions from '../../framework/Assertions';
import { Mockttp } from 'mockttp';
import {
  setupMockRequest,
  setupMockPostRequest,
} from '../../api-mocking/helpers/mockHelpers';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import {
  SIMULATION_ENABLED_NETWORKS_MOCK,
  SEND_ETH_SIMULATION_MOCK,
} from '../../api-mocking/mock-responses/simulations';
import { confirmationsRedesignedFeatureFlags } from '../../api-mocking/mock-responses/feature-flags-mocks';
import AddContactView from '../../pages/Settings/Contacts/AddContactView';
import DeleteContactBottomSheet from '../../pages/Settings/Contacts/DeleteContactBottomSheet';

const INVALID_ADDRESS = '0xB8B4EE5B1b693971eB60bDa15211570df2dB221L';
const MYTH_ADDRESS = '0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6';

const TEST_CONTACT = {
  address: '0x90aF68e1ec406e77C2EA0E4e6EAc9475062d6456',
  name: 'My Contact',
  editedName: 'My edited contact',
  network: 'Linea Main Network',
  editedNetwork: 'Sepolia',
};

const testSpecificMock = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    Object.assign({}, ...confirmationsRedesignedFeatureFlags),
  );

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: SIMULATION_ENABLED_NETWORKS_MOCK.urlEndpoint,
    response: SIMULATION_ENABLED_NETWORKS_MOCK.response,
    responseCode: 200,
  });

  const {
    urlEndpoint: simulationEndpoint,
    requestBody,
    response: simulationResponse,
    ignoreFields,
  } = SEND_ETH_SIMULATION_MOCK;

  await setupMockPostRequest(
    mockServer,
    simulationEndpoint,
    requestBody,
    simulationResponse,
    {
      statusCode: 200,
      ignoreFields: ignoreFields || [],
    },
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
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withNetworkEnabledMap({
            eip155: { '0x539': true },
          })
          .withProfileSyncingDisabled()
          .build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await loginToApp();
        await WalletView.tapWalletSendButton();
        await Assertions.expectElementToBeVisible(SendView.addressInputField);
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
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withNetworkEnabledMap({
            eip155: { '0x539': true },
          })
          .withProfileSyncingDisabled()
          .build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await loginToApp();
        await WalletView.tapWalletSendButton();
        await Assertions.expectElementToBeVisible(SendView.addressInputField);
        await SendView.inputAddress(INVALID_ADDRESS);
        // iOS renders a banner text instead of the legacy id
        await Assertions.expectTextDisplayed('Recipient address is invalid.');
        await SendView.removeAddress();
      },
    );
  });

  // The following tests depend on MM_REMOVE_GLOBAL_NETWORK_SELECTOR being enabled.
  itif(isRemoveGlobalNetworkSelectorEnabled)(
    'should add a contact with a different network',
    async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withGanacheNetwork()
            .withNetworkEnabledMap({
              eip155: { '0x539': true },
            })
            .withProfileSyncingDisabled()
            .build(),
          testSpecificMock,
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
          await TabBarComponent.tapSettings();
          await SettingsView.tapContacts();
          await ContactsView.expectContactIsNotVisible(TEST_CONTACT.editedName);
        },
      );
    },
  );
});
