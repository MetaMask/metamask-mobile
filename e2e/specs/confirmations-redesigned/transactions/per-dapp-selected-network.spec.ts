import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.ts';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.ts';
import {
  buildPermissions,
  AnvilPort,
} from '../../../framework/fixtures/FixtureUtils.ts';
import Browser from '../../../pages/Browser/BrowserView.ts';
import ConfirmationFooterActions from '../../../pages/Browser/Confirmations/FooterActions.ts';
import ConfirmationUITypes from '../../../pages/Browser/Confirmations/ConfirmationUITypes.ts';
import TestDApp from '../../../pages/Browser/TestDApp.ts';
import NetworkListModal from '../../../pages/Network/NetworkListModal.ts';
import TabBarComponent from '../../../pages/wallet/TabBarComponent.ts';
import WalletView from '../../../pages/wallet/WalletView.ts';
import { SmokeConfirmationsRedesigned } from '../../../tags.js';
import Assertions from '../../../framework/Assertions.ts';
import { loginToApp, navigateToBrowserView } from '../../../viewHelper.ts';
import { DappVariants } from '../../../framework/Constants.ts';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper.ts';
import { confirmationsRedesignedFeatureFlags } from '../../../api-mocking/mock-responses/feature-flags-mocks.ts';
import { Mockttp } from 'mockttp';
import { LocalNode } from '../../../framework/types';
import { AnvilManager } from '../../../seeder/anvil-manager';

const LOCAL_CHAIN_ID = '0x539';
const LOCAL_CHAIN_NAME = 'Localhost';

async function changeNetworkFromNetworkListModal(networkName: string) {
  await TabBarComponent.tapWallet();
  await WalletView.tapTokenNetworkFilter();
  await NetworkListModal.changeNetworkTo(networkName);
}

describe(SmokeConfirmationsRedesigned('Dapp Network Switching'), () => {
  const testSpecificMock = async (mockServer: Mockttp) => {
    await setupRemoteFeatureFlagsMock(
      mockServer,
      Object.assign({}, ...confirmationsRedesignedFeatureFlags),
    );
  };

  beforeAll(async () => {
    jest.setTimeout(15000);
  });

  it('submits a transaction to a dapp-specific selected network', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: ({ localNodes }: { localNodes?: LocalNode[] }) => {
          const node = localNodes?.[0] as unknown as AnvilManager;
          const rpcPort =
            node instanceof AnvilManager
              ? (node.getPort() ?? AnvilPort())
              : undefined;

          return new FixtureBuilder()
            .withNetworkController({
              providerConfig: {
                chainId: LOCAL_CHAIN_ID,
                rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
                type: 'custom',
                nickname: LOCAL_CHAIN_NAME,
                ticker: 'ETH',
              },
            })
            .withPermissionControllerConnectedToTestDapp(
              buildPermissions([LOCAL_CHAIN_ID]),
            )
            .build();
        },
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
        await Browser.navigateToTestDApp();

        // Make sure the dapp is connected to the predefined network in configuration (LOCAL_CHAIN_ID)
        // by checking chainId text in the test dapp
        await TestDApp.verifyCurrentNetworkText('Chain id ' + LOCAL_CHAIN_ID);

        // Change the network to Ethereum Main Network in app
        await changeNetworkFromNetworkListModal('Ethereum Main Network');

        await navigateToBrowserView();
        // Assert the dapp is still connected the previously selected network (LOCAL_CHAIN_ID)
        await TestDApp.verifyCurrentNetworkText('Chain id ' + LOCAL_CHAIN_ID);

        // Now do a transaction
        await TestDApp.tapSendEIP1559Button();

        // Wait for the confirmation modal to appear
        await Assertions.expectElementToBeVisible(
          ConfirmationUITypes.ModalConfirmationContainer,
        );

        // Assert the transaction is happening on the correct network
        await Assertions.expectTextDisplayed(LOCAL_CHAIN_NAME);

        // Accept confirmation
        await ConfirmationFooterActions.tapConfirmButton();

        // Change the network to Localhost in app
        await changeNetworkFromNetworkListModal(LOCAL_CHAIN_NAME);

        // Check activity tab
        await TabBarComponent.tapActivity();
        await Assertions.expectTextDisplayed('Confirmed');
      },
    );
  });
});
