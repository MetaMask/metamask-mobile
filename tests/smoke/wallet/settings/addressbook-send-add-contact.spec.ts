import { RegressionWalletPlatform } from '../../../../e2e/tags';
import WalletView from '../../../../e2e/pages/wallet/WalletView';
import TabBarComponent from '../../../../e2e/pages/wallet/TabBarComponent';
import SettingsView from '../../../../e2e/pages/Settings/SettingsView';
import ContactsView from '../../../../e2e/pages/Settings/Contacts/ContactsView';
import { loginToApp } from '../../../../e2e/viewHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import Assertions from '../../../framework/Assertions';
import { Mockttp } from 'mockttp';
import {
  setupMockRequest,
  setupMockPostRequest,
} from '../../../api-mocking/helpers/mockHelpers';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import {
  SIMULATION_ENABLED_NETWORKS_MOCK,
  SEND_ETH_SIMULATION_MOCK,
} from '../../../api-mocking/mock-responses/simulations';
import { confirmationFeatureFlags } from '../../../api-mocking/mock-responses/feature-flags-mocks';
import AddContactView from '../../../../e2e/pages/Settings/Contacts/AddContactView';
import DeleteContactBottomSheet from '../../../../e2e/pages/Settings/Contacts/DeleteContactBottomSheet';
import { LocalNode } from '../../../framework/types';
import { AnvilPort } from '../../../framework/fixtures/FixtureUtils';
import { AnvilManager } from '../../../seeder/anvil-manager';
import RedesignedSendView from '../../../../e2e/pages/Send/RedesignedSendView';

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
    Object.assign({}, ...confirmationFeatureFlags),
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
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should add a contact with a different network', async () => {
    await withFixtures(
      {
        fixture: ({ localNodes }: { localNodes?: LocalNode[] }) => {
          const node = localNodes?.[0] as unknown as AnvilManager;
          const rpcPort =
            node instanceof AnvilManager
              ? (node.getPort() ?? AnvilPort())
              : undefined;

          return new FixtureBuilder()
            .withNetworkController({
              providerConfig: {
                chainId: '0x539',
                rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
                type: 'custom',
                nickname: 'Local RPC',
                ticker: 'ETH',
              },
            })
            .withNetworkEnabledMap({
              eip155: { '0x539': true },
            })
            .withProfileSyncingDisabled()
            .build();
        },
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
        await ContactsView.expectContactIsVisible(TEST_CONTACT.name);

        // should edit a contact with a different network
        await ContactsView.tapOnAlias(TEST_CONTACT.name);
        await AddContactView.tapEditButton();
        await AddContactView.typeInName(TEST_CONTACT.editedName);
        await AddContactView.selectNetwork(TEST_CONTACT.editedNetwork);
        await AddContactView.tapEditContactCTA();
        await Assertions.expectElementToBeVisible(ContactsView.container);
        await ContactsView.expectContactIsVisible(TEST_CONTACT.editedName);
        await ContactsView.expectContactIsNotVisible(TEST_CONTACT.name);

        // should display all EVM contacts in the send flow
        await TabBarComponent.tapWallet();
        await WalletView.tapWalletSendButton();
        await RedesignedSendView.inputRecipientAddress(
          TEST_CONTACT.editedName[0],
        );
        await Assertions.expectTextDisplayed(TEST_CONTACT.editedName, {
          allowDuplicates: true,
        });
        await RedesignedSendView.tapBackButton();

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
  });
});
