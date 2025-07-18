import AccountActionsBottomSheet from '../../../../pages/wallet/AccountActionsBottomSheet';
import SwitchAccountModal from '../../../../pages/wallet/SwitchAccountModal';
import AccountListBottomSheet from '../../../../pages/wallet/AccountListBottomSheet';
import Assertions from '../../../../utils/Assertions';
import Browser from '../../../../pages/Browser/BrowserView';
import ConfirmationUITypes from '../../../../pages/Browser/Confirmations/ConfirmationUITypes';
import FixtureBuilder from '../../../../fixtures/fixture-builder';
import FooterActions from '../../../../pages/Browser/Confirmations/FooterActions';
import NetworkEducationModal from '../../../../pages/Network/NetworkEducationModal';
import NetworkListModal from '../../../../pages/Network/NetworkListModal';
import RowComponents from '../../../../pages/Browser/Confirmations/RowComponents';
import TabBarComponent from '../../../../pages/wallet/TabBarComponent';
import TestDApp from '../../../../pages/Browser/TestDApp';
import TestHelpers from '../../../../helpers';
import WalletView from '../../../../pages/wallet/WalletView';
import { SIMULATION_ENABLED_NETWORKS_MOCK } from '../../../../api-mocking/mock-responses/simulations';
import { buildPermissions } from '../../../../fixtures/utils';
import { loginToApp } from '../../../../viewHelper';
import { mockEvents } from '../../../../api-mocking/mock-config/mock-events';
import { SmokeConfirmationsRedesigned } from '../../../../tags';
import { withFixtures } from '../../../../fixtures/fixture-helper';

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
  await Assertions.checkIfVisible(RowComponents.AccountNetwork);
  await Assertions.checkIfVisible(RowComponents.GasFeesDetails);
  await Assertions.checkIfVisible(RowComponents.AdvancedDetails);
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
  const testSpecificMock = {
    POST: [],
    GET: [
      SIMULATION_ENABLED_NETWORKS_MOCK,
      mockEvents.GET.remoteFeatureFlagsRedesignedConfirmations,
    ],
  };

  beforeAll(async () => {
    jest.setTimeout(2500000);
    await TestHelpers.reverseServerPort();
  });

  it('submit sendCalls, upgrade, downgrade account', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp(
            buildPermissions(['0x539']),
          )
          .build(),
        restartDevice: true,
        // @ts-expect-error Type for this property does not exist yet.
        localNodeOptions,
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
        await Assertions.checkIfTextIsDisplayed('Includes 2 transactions');
        await Assertions.checkIfVisible(
          ConfirmationUITypes.ModalConfirmationContainer,
        );
        await checkConfirmationPage();
        await Assertions.checkIfVisible(RowComponents.SimulationDetails);

        // Accept confirmation
        await FooterActions.tapConfirmButton();

        // Check activity tab
        await TabBarComponent.tapActivity();
        await Assertions.checkIfTextIsDisplayed('Upgrade to smart account');

        // open switch account modal to downgrade account
        await TabBarComponent.tapWallet();
        await tapSwitchAccountModal();

        // Check all expected elements are visible
        await Assertions.checkIfTextIsDisplayed('Account update');
        await Assertions.checkIfTextIsDisplayed(
          "You're switching back to a standard account (EOA).",
        );
        await Assertions.checkIfVisible(
          ConfirmationUITypes.ModalConfirmationContainer,
        );
        await checkConfirmationPage();

        // Accept confirmation
        await FooterActions.tapConfirmButton();

        // Check activity tab
        await TabBarComponent.tapActivity();
        await Assertions.checkIfTextIsDisplayed('Switch to standard account');
      },
    );
  });

  it('upgrades an account', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        // @ts-expect-error Type for this property does not exist yet.
        localNodeOptions,
        testSpecificMock,
      },
      async () => {
        await loginToApp();

        // Create confirmation to upgrade account
        await TabBarComponent.tapWallet();
        await changeNetworkFromNetworkListModal();
        await tapSwitchAccountModal();

        // Check all expected elements are visible
        await Assertions.checkIfTextIsDisplayed('Account update');
        await Assertions.checkIfTextIsDisplayed(
          "You're switching to a smart account.",
        );
        await Assertions.checkIfVisible(
          ConfirmationUITypes.ModalConfirmationContainer,
        );
        await checkConfirmationPage();

        // Accept confirmation
        await FooterActions.tapConfirmButton();

        // Check activity tab
        await TabBarComponent.tapActivity();
        await Assertions.checkIfTextIsDisplayed('Upgrade to smart account');
      },
    );
  });
});
