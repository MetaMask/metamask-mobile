import { SmokeConfirmationsRedesigned } from '../../../tags';
import TestHelpers from '../../../helpers';
import { loginToApp } from '../../../viewHelper';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../../fixtures/fixture-helper';
import { buildPermissions } from '../../../fixtures/utils';
import {
  SEND_ETH_SIMULATION_MOCK,
  SIMULATION_ENABLED_NETWORKS_MOCK,
} from '../../../api-mocking/mock-responses/simulations';
import Assertions from '../../../utils/Assertions';
import WalletActionsBottomSheet from '../../../pages/wallet/WalletActionsBottomSheet';
import FixtureBuilder from '../../../fixtures/fixture-builder';
import { mockEvents } from '../../../api-mocking/mock-config/mock-events.js';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import ConfirmationUITypes from '../../../pages/Browser/Confirmations/ConfirmationUITypes';
import FooterActions from '../../../pages/Browser/Confirmations/FooterActions';
import SendView from '../../../pages/Send/SendView';
import AmountView from '../../../pages/Send/AmountView';
import RowComponents from '../../../pages/Browser/Confirmations/RowComponents';
import WalletView from '../../../pages/wallet/WalletView';
import NetworkListModal from '../../../pages/Network/NetworkListModal';
import NetworkEducationModal from '../../../pages/Network/NetworkEducationModal';
import { CustomNetworks } from '../../../resources/networks.e2e';

const RECIPIENT = '0xbeC040014De5b4f1117EdD010828EA35cEc28B30';
const AMOUNT = '1';
const SMALL_AMOUNT = '0.0000001';
const MONAD_TESTNET = CustomNetworks.MonadTestnet.providerConfig;
const MEGAETH_TESTNET = CustomNetworks.MegaTestnet.providerConfig;

describe(SmokeConfirmationsRedesigned('Wallet Initiated Transfer'), () => {
  const testSpecificMock = {
    POST: [SEND_ETH_SIMULATION_MOCK],
    GET: [
      SIMULATION_ENABLED_NETWORKS_MOCK,
      mockEvents.GET.remoteFeatureFlagsRedesignedConfirmations,
    ],
  };

  beforeAll(async () => {
    jest.setTimeout(2500000);
    await TestHelpers.reverseServerPort();
  });

  it('sends native asset', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPermissionControllerConnectedToTestDapp(
            buildPermissions(['0x539']),
          )
          .build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
        testSpecificMock,
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapActions();
        await TestHelpers.delay(2000);
        await WalletActionsBottomSheet.tapSendButton();

        await SendView.inputAddress(RECIPIENT);
        await SendView.tapNextButton();

        await AmountView.typeInTransactionAmount(AMOUNT);
        await AmountView.tapNextButton();

        // Check all expected elements are visible
        await Assertions.checkIfVisible(
          ConfirmationUITypes.FlatConfirmationContainer,
        );
        await Assertions.checkIfVisible(RowComponents.TokenHero);
        await Assertions.checkIfTextIsDisplayed('1 ETH');
        await Assertions.checkIfVisible(RowComponents.FromTo);
        await Assertions.checkIfVisible(RowComponents.GasFeesDetails);
        await Assertions.checkIfVisible(RowComponents.AdvancedDetails);

        // Accept confirmation
        await FooterActions.tapConfirmButton();

        // Check activity tab
        await TabBarComponent.tapActivity();
        await Assertions.checkIfTextIsDisplayed('Confirmed');
      },
    );
  });

  it(`should send native ${MONAD_TESTNET.nickname} from inside the wallet`, async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withGanacheNetwork().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await WalletView.tapNetworksButtonOnNavBar();
        await Assertions.checkIfVisible(NetworkListModal.networkScroll);
        await NetworkListModal.scrollToBottomOfNetworkList();
        await Assertions.checkIfToggleIsOn(NetworkListModal.testNetToggle);
        await NetworkListModal.changeNetworkTo(MONAD_TESTNET.nickname);
        await Assertions.checkIfVisible(NetworkEducationModal.container);
        await Assertions.checkIfElementToHaveText(
          NetworkEducationModal.networkName,
          MONAD_TESTNET.nickname,
        );
        await NetworkEducationModal.tapGotItButton();

        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapSendButton();

        await SendView.inputAddress(RECIPIENT);
        await SendView.tapNextButton();

        await AmountView.typeInTransactionAmount(SMALL_AMOUNT);
        await AmountView.tapNextButton();

        await FooterActions.tapConfirmButton();
        await TabBarComponent.tapActivity();

        await Assertions.checkIfTextIsDisplayed('Confirmed');
      },
    );
  });

  it(`should send native ${MEGAETH_TESTNET.nickname} from inside the wallet`, async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withGanacheNetwork().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await WalletView.tapNetworksButtonOnNavBar();
        await Assertions.checkIfVisible(NetworkListModal.networkScroll);
        await NetworkListModal.scrollToBottomOfNetworkList();
        //Verify testnet toggle is enabled
        await Assertions.checkIfToggleIsOn(NetworkListModal.testNetToggle);
        //Change network to MegaETH Testnet
        await NetworkListModal.changeNetworkTo(MEGAETH_TESTNET.nickname);
        await Assertions.checkIfVisible(NetworkEducationModal.container);
        await Assertions.checkIfElementToHaveText(
          NetworkEducationModal.networkName,
          MEGAETH_TESTNET.nickname,
        );
        await NetworkEducationModal.tapGotItButton();

        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapSendButton();

        await SendView.inputAddress(RECIPIENT);
        await SendView.tapNextButton();

        await AmountView.typeInTransactionAmount(SMALL_AMOUNT);
        await AmountView.tapNextButton();

        await FooterActions.tapConfirmButton();
        await TabBarComponent.tapActivity();

        await Assertions.checkIfTextIsDisplayed('Confirmed');
      },
    );
  });
});
