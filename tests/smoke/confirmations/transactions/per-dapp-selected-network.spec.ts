import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import {
  buildPermissions,
  AnvilPort,
} from '../../../framework/fixtures/FixtureUtils';
import Browser from '../../../../e2e/pages/Browser/BrowserView';
import ConfirmationFooterActions from '../../../../e2e/pages/Browser/Confirmations/FooterActions';
import ConfirmationUITypes from '../../../../e2e/pages/Browser/Confirmations/ConfirmationUITypes';
import TestDApp from '../../../../e2e/pages/Browser/TestDApp';
import NetworkListModal from '../../../../e2e/pages/Network/NetworkListModal';
import TabBarComponent from '../../../../e2e/pages/wallet/TabBarComponent';
import WalletView from '../../../../e2e/pages/wallet/WalletView';
import { SmokeConfirmations } from '../../../../e2e/tags.js';
import Assertions from '../../../framework/Assertions';
import { loginToApp, navigateToBrowserView } from '../../../../e2e/viewHelper';
import { DappVariants } from '../../../framework/Constants';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { confirmationFeatureFlags } from '../../../api-mocking/mock-responses/feature-flags-mocks';
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

describe(SmokeConfirmations('Dapp Network Switching'), () => {
  const testSpecificMock = async (mockServer: Mockttp) => {
    await setupRemoteFeatureFlagsMock(
      mockServer,
      Object.assign({}, ...confirmationFeatureFlags),
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

        // Close browser to reveal app tab bar before changing network
        await Browser.tapCloseBrowserButton();

        // Wait for browser screen to disappear and tab bar to be visible
        await Assertions.expectElementToBeVisible(
          TabBarComponent.tabBarWalletButton,
          {
            description: 'Tab bar should be visible after closing browser',
          },
        );

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

        // Wait for browser screen to be visible after confirmation modal dismisses
        await Assertions.expectElementToBeVisible(Browser.browserScreenID, {
          description:
            'Browser screen should be visible after confirming transaction',
        });

        // Close browser to reveal app tab bar before changing network
        await Browser.tapCloseBrowserButton();

        // Wait for browser screen to disappear and tab bar to be visible
        await Assertions.expectElementToBeVisible(
          TabBarComponent.tabBarWalletButton,
          {
            description: 'Tab bar should be visible after closing browser',
          },
        );

        // Change the network to Localhost in app
        await changeNetworkFromNetworkListModal(LOCAL_CHAIN_NAME);

        // Check activity tab (already on wallet from helper, just navigate)
        await TabBarComponent.tapActivity();
        await Assertions.expectTextDisplayed('Confirmed');
      },
    );
  });
});
