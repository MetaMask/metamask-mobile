import AccountDetails from '../../../../pages/MultichainAccounts/AccountDetails';
import AccountListBottomSheet from '../../../../pages/wallet/AccountListBottomSheet';
import Assertions from '../../../../../tests/framework/Assertions';
import BrowserView from '../../../../pages/Browser/BrowserView';
import ConfirmationUITypes from '../../../../pages/Browser/Confirmations/ConfirmationUITypes';
import FixtureBuilder from '../../../../../tests/framework/fixtures/FixtureBuilder';
import FooterActions from '../../../../pages/Browser/Confirmations/FooterActions';
import NetworkListModal from '../../../../pages/Network/NetworkListModal';
import RowComponents from '../../../../pages/Browser/Confirmations/RowComponents';
import SwitchAccountModal from '../../../../pages/wallet/SwitchAccountModal';
import TabBarComponent from '../../../../pages/wallet/TabBarComponent';
import TestDApp from '../../../../pages/Browser/TestDApp';
import WalletView from '../../../../pages/wallet/WalletView';
import { SIMULATION_ENABLED_NETWORKS_MOCK } from '../../../../../tests/api-mocking/mock-responses/simulations';
import {
  AnvilPort,
  buildPermissions,
} from '../../../../../tests/framework/fixtures/FixtureUtils';
import { loginToApp, navigateToBrowserView } from '../../../../viewHelper';
import { SmokeConfirmationsRedesigned } from '../../../../tags';
import { withFixtures } from '../../../../../tests/framework/fixtures/FixtureHelper';
import { DappVariants } from '../../../../../tests/framework/Constants';
import {
  AnvilNodeOptions,
  LocalNode,
  LocalNodeType,
} from '../../../../../tests/framework';
import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../../../../tests/api-mocking/helpers/mockHelpers';
import { confirmationsRedesignedFeatureFlags } from '../../../../../tests/api-mocking/mock-responses/feature-flags-mocks';
import { setupRemoteFeatureFlagsMock } from '../../../../../tests/api-mocking/helpers/remoteFeatureFlagsHelper';
import { AnvilManager } from '../../../../../tests/seeder/anvil-manager';

const LOCAL_CHAIN_NAME = 'Local RPC';

const localNodeOptions = [
  {
    type: 'anvil',
    options: {
      hardfork: 'prague',
      loadState:
        './e2e/specs/confirmations/transactions/7702/withDelegatorContracts.json',
    },
  },
];

async function changeNetworkFromNetworkListModal() {
  await WalletView.tapTokenNetworkFilter();
  await NetworkListModal.tapOnCustomTab();
  await NetworkListModal.changeNetworkTo(LOCAL_CHAIN_NAME);
}

async function checkConfirmationPage() {
  await Assertions.expectElementToBeVisible(RowComponents.AccountNetwork);
  await Assertions.expectElementToBeVisible(RowComponents.GasFeesDetails);
  await Assertions.expectElementToBeVisible(RowComponents.AdvancedDetails);
}

async function tapSwitchAccountModal() {
  await WalletView.tapIdenticon();
  await AccountListBottomSheet.tapEditAccountActionsAtIndex(0);
  await SwitchAccountModal.tapSmartAccountLink();
  await SwitchAccountModal.tapSwitchAccountButton();
}

async function goBackToWalletPage() {
  await SwitchAccountModal.tapSmartAccountBackButton();
  await AccountDetails.tapBackButton();
  try {
    await AccountListBottomSheet.dismissAccountListModalV2();
  } catch (error) {
    // Modal might already be dismissed, continue with test
    console.log('Modal already dismissed or not found, continuing...');
  }
}

async function connectTestDappToLocalhost() {
  await navigateToBrowserView();
  await BrowserView.navigateToTestDApp();
}

/**
 * The test cases have been partially commented out and skipped.
 * Click event on switch account toggle is not working in the e2e tests.
 * Once that is fixed, the test cases can be uncommented and unskipped.
 */
describe(SmokeConfirmationsRedesigned('7702 - smart account'), () => {
  const testSpecificMock = async (mockServer: Mockttp) => {
    await setupMockRequest(mockServer, {
      requestMethod: 'GET',
      url: SIMULATION_ENABLED_NETWORKS_MOCK.urlEndpoint,
      response: SIMULATION_ENABLED_NETWORKS_MOCK.response,
      responseCode: 200,
    });
    await setupRemoteFeatureFlagsMock(
      mockServer,
      Object.assign({}, ...confirmationsRedesignedFeatureFlags),
    );
  };
  beforeAll(async () => {
    jest.setTimeout(2500000);
  });

  it('submit sendCalls, upgrade, downgrade account', async () => {
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
                chainId: '0x539',
                rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
                type: 'custom',
                nickname: 'Local RPC',
                ticker: 'ETH',
              },
            })
            .withPermissionControllerConnectedToTestDapp(
              buildPermissions(['0x539']),
            )
            .build();
        },
        restartDevice: true,
        localNodeOptions: [
          {
            type: LocalNodeType.anvil,
            options: localNodeOptions[0].options as AnvilNodeOptions,
          },
        ],
        testSpecificMock,
      },
      async () => {
        await loginToApp();

        // Submit send calls
        await changeNetworkFromNetworkListModal();
        await connectTestDappToLocalhost();

        await TestDApp.tapSendCallsButton();

        // Check all expected elements are visible
        await Assertions.expectTextDisplayed('Includes 2 transactions');
        await Assertions.expectElementToBeVisible(
          ConfirmationUITypes.ModalConfirmationContainer,
        );
        await checkConfirmationPage();
        await Assertions.expectElementToBeVisible(
          RowComponents.SimulationDetails,
        );

        // Accept confirmation
        await FooterActions.tapConfirmButton();

        // Wait for browser screen to be visible after confirmation modal dismisses
        await Assertions.expectElementToBeVisible(BrowserView.browserScreenID, {
          description:
            'Browser screen should be visible after confirming transaction',
        });

        // Close browser to reveal app tab bar, then check activity
        await BrowserView.tapCloseBrowserButton();
        await TabBarComponent.tapActivity();
        await Assertions.expectTextDisplayed('Smart contract interaction');

        // // open switch account modal to downgrade account
        // await TabBarComponent.tapWallet();
        // await tapSwitchAccountModal();

        // // Check all expected elements are visible
        // await Assertions.expectTextDisplayed('Account update');
        // await Assertions.expectTextDisplayed(
        //   "You're switching back to a standard account (EOA).",
        // );
        // await Assertions.expectElementToBeVisible(
        //   ConfirmationUITypes.ModalConfirmationContainer,
        // );
        // await checkConfirmationPage();

        // // Accept confirmation
        // await FooterActions.tapConfirmButton();

        // await goBackToWalletPage();
        // // Check activity tab
        // await TabBarComponent.tapActivity();
        // await Assertions.expectTextDisplayed('Switch to standard account');
      },
    );
  });

  it.skip('upgrades an account', async () => {
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
                chainId: '0x539',
                rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
                type: 'custom',
                nickname: 'Local RPC',
                ticker: 'ETH',
              },
            })
            .build();
        },
        restartDevice: true,
        localNodeOptions: [
          {
            type: LocalNodeType.anvil,
            options: localNodeOptions[0].options as AnvilNodeOptions,
          },
        ],
        testSpecificMock,
      },
      async () => {
        await loginToApp();

        // Create confirmation to upgrade account
        await changeNetworkFromNetworkListModal();
        await tapSwitchAccountModal();

        // Check all expected elements are visible
        await Assertions.expectTextDisplayed('Account update');
        await Assertions.expectTextDisplayed(
          "You're switching to a smart account.",
        );
        await Assertions.expectElementToBeVisible(
          ConfirmationUITypes.ModalConfirmationContainer,
        );
        await checkConfirmationPage();

        // Accept confirmation
        await FooterActions.tapConfirmButton();

        await goBackToWalletPage();
        // Close browser to reveal app tab bar, then check activity
        await BrowserView.tapCloseBrowserButton();
        await TabBarComponent.tapActivity();
        await Assertions.expectTextDisplayed('Upgrade to smart account');
      },
    );
  });
});
