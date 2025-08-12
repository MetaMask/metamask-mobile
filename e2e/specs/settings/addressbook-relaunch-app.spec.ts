import { SmokeWalletPlatform } from '../../tags';
import SettingsView from '../../pages/Settings/SettingsView';
import ContactsView from '../../pages/Settings/Contacts/ContactsView';
import AddContactView from '../../pages/Settings/Contacts/AddContactView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import TestHelpers from '../../helpers';
import { getFixturesServerPort } from '../../framework/fixtures/FixtureUtils';
import Assertions from '../../framework/Assertions';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { TestSpecificMock } from '../../framework';

const MEMO = 'Address for testing 123123123';

const testSpecificMock = {
  POST: [
    {
      urlEndpoint:
        'https://mainnet.infura.io/v3/267e54bc7b094f3f817b941097d249d8',
      requestBody: {
        id: 2252494772566,
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [
          {
            to: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
            data: '0x0178b8bf1644f81821b3a416a5994a954839db5a9a3fcd6790b12ee6a6d04d6ef62c36b2',
          },
          '0x160c022',
        ],
      },
      responseCode: 200,
      response: {
        jsonrpc: '2.0',
        id: 2252494772567,
        result:
          '0x000000000000000000000000e9a4bec6efad5ce161b44670af674c2d6daf0793',
      },
      ignoreFields: ['id'],
    },
  ],
} as TestSpecificMock;

describe(
  SmokeWalletPlatform('Relaunch App after Adding Address to Contact Book'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
    });

    it('should terminate and relaunch the app after adding a contact', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withProfileSyncingDisabled()
            .withNetworkController({
              providerConfig: {
                chainId: '0x1',
                rpcUrl:
                  'https://mainnet.infura.io/v3/267e54bc7b094f3f817b941097d249d8',
                type: 'rpc',
                nickname: 'Ethereum Mainnet',
                ticker: 'ETH',
              },
            })
            .build(),
          restartDevice: true,
          testSpecificMock,
        },
        async () => {
          await loginToApp();
          await device.disableSynchronization();
          await TabBarComponent.tapSettings();
          await SettingsView.tapContacts();
          await device.enableSynchronization();

          await ContactsView.tapAddContactButton();
          await AddContactView.typeInName('Curtis');

          await AddContactView.typeInAddress('curtis.eth');
          await AddContactView.typeInMemo(MEMO);
          await AddContactView.tapAddContactButton();
          await ContactsView.isContactAliasVisible('Curtis');
          await device.terminateApp();
          await TestHelpers.launchApp({
            launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
          });
          await loginToApp();
          await TabBarComponent.tapSettings();
          await SettingsView.tapContacts();
          await Assertions.expectElementToBeVisible(ContactsView.container);
          await ContactsView.isContactAliasVisible('Curtis');
          await TabBarComponent.tapWallet();
          await TabBarComponent.tapActions();
          await WalletActionsBottomSheet.tapSendButton();
          await Assertions.expectTextDisplayed('Curtis');
        },
      );
    });
  },
);
