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
import { NETWORK_TEST_CONFIGS } from '../../../resources/mock-configs';
import TestDApp from '../../../pages/Browser/TestDApp';

const RECIPIENT = '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb';
const AMOUNT = '1';
const SMALL_AMOUNT = '0.0000001';

describe(SmokeConfirmationsRedesigned('Wallet Initiated Transfer'), () => {
  const localTestSpecificMock = {
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
        testSpecificMock: localTestSpecificMock,
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

  // Table-driven tests for network switching
  for (const networkConfig of NETWORK_TEST_CONFIGS) {
    it(`should switch to ${networkConfig.name} network`, async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withNetworkController({
              providerConfig: networkConfig.providerConfig,
            })
            .withPermissionControllerConnectedToTestDapp(
              buildPermissions(networkConfig.permissions)
            )
            .build(),
          restartDevice: true,
          ganacheOptions: networkConfig.ganacheOptions,
          testSpecificMock: networkConfig.testSpecificMock,
        },
        async () => {
          await loginToApp();

          await WalletView.tapNetworksButtonOnNavBar();
          await Assertions.checkIfVisible(NetworkListModal.networkScroll);
          await NetworkListModal.scrollToBottomOfNetworkList();
          await NetworkListModal.changeNetworkTo(networkConfig.networkConfig.nickname);
          await Assertions.checkIfVisible(NetworkEducationModal.container);

          await NetworkEducationModal.tapGotItButton();

          // Verify we're on the correct network
          await Assertions.checkIfTextIsDisplayed(networkConfig.networkConfig.nickname);
        },
      );
    });
  }

  // Table-driven tests for wallet transfers
  for (const networkConfig of NETWORK_TEST_CONFIGS) {
    it(`should send native ${networkConfig.name} from inside the wallet`, async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withNetworkController({
              providerConfig: networkConfig.providerConfig,
            })
            .withPermissionControllerConnectedToTestDapp(
              buildPermissions(networkConfig.permissions)
            )
            .build(),
          restartDevice: true,
          ganacheOptions: networkConfig.ganacheOptions,
          testSpecificMock: networkConfig.testSpecificMock,
        },
        async () => {
          await loginToApp();

          // Network should already be configured, no need to switch
          await TabBarComponent.tapActions();
          await WalletActionsBottomSheet.tapSendButton();

          await SendView.inputAddress(RECIPIENT);
          await SendView.tapNextButton();

          await AmountView.typeInTransactionAmount(SMALL_AMOUNT);
          await AmountView.tapNextButton();

          await TestDApp.tapConfirmButton();
          await TestHelpers.delay(3000);
          await TabBarComponent.tapActivity();

          await Assertions.checkIfTextIsDisplayed('Confirmed');
        },
      );
    });
  }

});
