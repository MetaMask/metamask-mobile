import AccountActionsBottomSheet from '../../pages/wallet/AccountActionsBottomSheet';
import SwitchAccountModal from '../../pages/wallet/SwitchAccountModal';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import Assertions from '../../framework/Assertions';
import Browser from '../../pages/Browser/BrowserView';
import ConfirmationUITypes from '../../pages/Browser/Confirmations/ConfirmationUITypes';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import FooterActions from '../../pages/Browser/Confirmations/FooterActions';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import RowComponents from '../../pages/Browser/Confirmations/RowComponents';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestDApp from '../../pages/Browser/TestDApp';
import WalletView from '../../pages/wallet/WalletView';
import { SIMULATION_ENABLED_NETWORKS_MOCK } from '../../api-mocking/mock-responses/simulations';
import { buildPermissions } from '../../framework/fixtures/FixtureUtils';
import { loginToApp } from '../../viewHelper';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import { SmokeConfirmationsRedesigned } from '../../tags';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { DappVariants } from '../../framework/Constants';
import { AnvilNodeOptions, LocalNodeType } from '../../framework';
import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../api-mocking/mockHelpers';

const LOCAL_CHAIN_NAME = 'Localhost';

const localNodeOptions = [
  {
    type: 'anvil',
    options: {
      hardfork: 'prague',
      loadState:
        './e2e/specs/confirmations-redesigned/transactions/7702/withDelegatorContracts.json',
    },
  },
];

async function changeNetworkFromNetworkListModal() {
  await TabBarComponent.tapWallet();
  await WalletView.tapNetworksButtonOnNavBar();
  await NetworkListModal.changeNetworkTo(LOCAL_CHAIN_NAME);
  await device.disableSynchronization();
  await NetworkEducationModal.tapGotItButton();
  await device.enableSynchronization();
}

async function checkConfirmationPage() {
  await Assertions.expectElementToBeVisible(RowComponents.AccountNetwork);
  await Assertions.expectElementToBeVisible(RowComponents.GasFeesDetails);
  await Assertions.expectElementToBeVisible(RowComponents.AdvancedDetails);
}

async function tapSwitchAccountModal() {
  await WalletView.tapIdenticon();
  await AccountListBottomSheet.tapEditAccountActionsAtIndex(0);
  await AccountActionsBottomSheet.tapSwitchToSmartAccount();
  await SwitchAccountModal.tapSwitchAccountButton();
}

async function connectTestDappToLocalhost() {
  await TabBarComponent.tapBrowser();
  await Browser.navigateToTestDApp();
  await TestDApp.tapRevokeAccountPermission();
  await TestDApp.tapRequestPermissions();
  await TestDApp.tapConnectButton();
}

describe(SmokeConfirmationsRedesigned('7702 - smart account'), () => {
  const testSpecificMock = async (mockServer: Mockttp) => {
    const { urlEndpoint, response } =
      mockEvents.GET.remoteFeatureFlagsRedesignedConfirmations;
    await setupMockRequest(mockServer, {
      requestMethod: 'GET',
      url: SIMULATION_ENABLED_NETWORKS_MOCK.urlEndpoint,
      response: SIMULATION_ENABLED_NETWORKS_MOCK.response,
      responseCode: 200,
    });
    await setupMockRequest(mockServer, {
      requestMethod: 'GET',
      url: urlEndpoint,
      response,
      responseCode: 200,
    });
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
        fixture: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp(
            buildPermissions(['0x539']),
          )
          .build(),
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
        await TabBarComponent.tapWallet();
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

        // Check activity tab
        await TabBarComponent.tapActivity();
        await Assertions.expectTextDisplayed('Upgrade to smart account');

        // open switch account modal to downgrade account
        await TabBarComponent.tapWallet();
        await tapSwitchAccountModal();

        // Check all expected elements are visible
        await Assertions.expectTextDisplayed('Account update');
        await Assertions.expectTextDisplayed(
          "You're switching back to a standard account (EOA).",
        );
        await Assertions.expectElementToBeVisible(
          ConfirmationUITypes.ModalConfirmationContainer,
        );
        await checkConfirmationPage();

        // Accept confirmation
        await FooterActions.tapConfirmButton();

        // Check activity tab
        await TabBarComponent.tapActivity();
        await Assertions.expectTextDisplayed('Switch to standard account');
      },
    );
  });

  it('upgrades an account', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder().build(),
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
        await TabBarComponent.tapWallet();
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

        // Check activity tab
        await TabBarComponent.tapActivity();
        await Assertions.expectTextDisplayed('Upgrade to smart account');
      },
    );
  });
});
