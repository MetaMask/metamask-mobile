import { SmokeWalletPlatform } from '../../tags';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView';
import ContactsView from '../../pages/Settings/Contacts/ContactsView';
import AddContactView from '../../pages/Settings/Contacts/AddContactView';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import Assertions from '../../../tests/framework/Assertions';
import { Mockttp } from 'mockttp';
import {
  setupMockRequest,
  setupMockPostRequest,
} from '../../../tests/api-mocking/helpers/mockHelpers';
import { setupRemoteFeatureFlagsMock } from '../../../tests/api-mocking/helpers/remoteFeatureFlagsHelper';
import {
  SIMULATION_ENABLED_NETWORKS_MOCK,
  SEND_ETH_SIMULATION_MOCK,
} from '../../../tests/api-mocking/mock-responses/simulations';
import { confirmationsRedesignedFeatureFlags } from '../../../tests/api-mocking/mock-responses/feature-flags-mocks';
import CommonView from '../../pages/CommonView';
import enContent from '../../../locales/languages/en.json';
import WalletView from '../../pages/wallet/WalletView';
import { device } from 'detox';

const MEMO = 'Test adding ENS';
const INVALID_ADDRESS = '0xB8B4EE5B1b693971eB60bDa15211570df2dB221L';

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

  // ENS Resolution mocks
  const INFURA_MAINNET_REGEX = /https:\/\/mainnet\.infura\.io\/v3\//i;
  const ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
  const PUBLIC_RESOLVER = '0x4976fb03C32e5B8cfe2b6dE59bF6bE9aEa5C1D13';
  const RESOLVED_ADDRESS = '0x1234567890aBCdef1234567890abCDef12345678';

  const encodeAddress32 = (addr: string) =>
    `0x${'0'.repeat(24)}${addr.replace(/^0x/i, '').toLowerCase()}`.padStart(
      66,
      '0',
    );

  await setupMockPostRequest(
    mockServer,
    INFURA_MAINNET_REGEX,
    { jsonrpc: '2.0' },
    { jsonrpc: '2.0', id: 1, result: '0x' },
    { statusCode: 200, ignoreFields: ['id', 'method', 'params'], priority: 1 },
  );

  await setupMockPostRequest(
    mockServer,
    INFURA_MAINNET_REGEX,
    {
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [
        {
          to: ENS_REGISTRY,
        },
        '0x1',
      ],
    },
    { jsonrpc: '2.0', id: 1, result: encodeAddress32(PUBLIC_RESOLVER) },
    {
      statusCode: 200,
      ignoreFields: ['id', 'params.0.data', 'params.1'],
      priority: 1000,
    },
  );

  await setupMockPostRequest(
    mockServer,
    INFURA_MAINNET_REGEX,
    {
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [
        {
          to: PUBLIC_RESOLVER.toLowerCase(),
        },
        '0x1',
      ],
    },
    { jsonrpc: '2.0', id: 1, result: encodeAddress32(RESOLVED_ADDRESS) },
    {
      statusCode: 200,
      ignoreFields: ['id', 'params.0.data', 'params.1'],
      priority: 1000,
    },
  );
};

describe.skip(SmokeWalletPlatform('Addressbook ENS Tests'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should add an ENS address via the contacts view and edit it', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withProfileSyncingDisabled().build(),
        testSpecificMock,
        restartDevice: true,
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
        if (device.getPlatform() === 'android') {
          await TabBarComponent.tapSettings();
          await SettingsView.tapContacts();
        }
        await Assertions.expectTextDisplayed('Ibrahim edited', {
          timeout: 20000,
          description: 'Edited contact visible in contacts list',
        });
        await ContactsView.expectContactIsNotVisible('Ibrahim'); // Ensure Ibrahim is not visible

        // should go back to send flow to validate newly added address is displayed
        await CommonView.tapBackButton();
        await TabBarComponent.tapWallet();
        await WalletView.tapWalletSendButton();
        await Assertions.expectTextDisplayed('Ibrahim edited', {
          timeout: 20000,
          description: 'Edited contact visible in send flow',
        });
      },
    );
  });
});
