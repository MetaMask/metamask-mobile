import { SmokeConfirmationsRedesigned } from '../../../tags';
import { loginToApp } from '../../../viewHelper';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import { buildPermissions } from '../../../fixtures/utils';
import {
  SEND_ETH_SIMULATION_MOCK,
  SIMULATION_ENABLED_NETWORKS_MOCK,
} from '../../../api-mocking/mock-responses/simulations';
import Assertions from '../../../framework/Assertions';
import WalletActionsBottomSheet from '../../../pages/wallet/WalletActionsBottomSheet';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { mockEvents } from '../../../api-mocking/mock-config/mock-events';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import ConfirmationUITypes from '../../../pages/Browser/Confirmations/ConfirmationUITypes';
import FooterActions from '../../../pages/Browser/Confirmations/FooterActions';
import SendView from '../../../pages/Send/SendView';
import AmountView from '../../../pages/Send/AmountView';
import RowComponents from '../../../pages/Browser/Confirmations/RowComponents';
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
        testSpecificMock: localTestSpecificMock,
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapSendButton();

        await SendView.inputAddress(RECIPIENT);
        await SendView.tapNextButton();

        await AmountView.typeInTransactionAmount(AMOUNT);
        await AmountView.tapNextButton();

        // Check all expected elements are visible
        await Assertions.expectElementToBeVisible(
          ConfirmationUITypes.FlatConfirmationContainer,
        );
        await Assertions.expectElementToBeVisible(RowComponents.TokenHero);
        await Assertions.expectTextDisplayed('1 ETH');
        await Assertions.expectElementToBeVisible(RowComponents.FromTo);
        await Assertions.expectElementToBeVisible(RowComponents.GasFeesDetails);
        await Assertions.expectElementToBeVisible(
          RowComponents.AdvancedDetails,
        );

        // Accept confirmation
        await FooterActions.tapConfirmButton();

        // Check activity tab
        await TabBarComponent.tapActivity();
        await Assertions.expectTextDisplayed('Confirmed');
      },
    );
  });

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
              buildPermissions(networkConfig.permissions),
            )
            .build(),
          restartDevice: true,
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
          await TabBarComponent.tapActivity();

          await Assertions.expectTextDisplayed('Confirmed');
        },
      );
    });
  }
});
