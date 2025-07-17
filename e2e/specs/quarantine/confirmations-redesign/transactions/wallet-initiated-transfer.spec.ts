import { SmokeConfirmationsRedesigned } from '../../../../tags.js';
import TestHelpers from '../../../../helpers.js';
import { loginToApp } from '../../../../viewHelper.js';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../../../fixtures/fixture-helper.js';
import { buildPermissions } from '../../../../fixtures/utils.js';
import {
  SEND_ETH_SIMULATION_MOCK,
  SIMULATION_ENABLED_NETWORKS_MOCK,
} from '../../../../api-mocking/mock-responses/simulations.js';
import Assertions from '../../../../utils/Assertions.js';
import WalletActionsBottomSheet from '../../../../pages/wallet/WalletActionsBottomSheet.js';
import FixtureBuilder from '../../../../fixtures/fixture-builder.js';
import { mockEvents } from '../../../../api-mocking/mock-config/mock-events.js';
import TabBarComponent from '../../../../pages/wallet/TabBarComponent.js';
import ConfirmationUITypes from '../../../../pages/Browser/Confirmations/ConfirmationUITypes.js';
import FooterActions from '../../../../pages/Browser/Confirmations/FooterActions.js';
import SendView from '../../../../pages/Send/SendView.js';
import AmountView from '../../../../pages/Send/AmountView.js';
import RowComponents from '../../../../pages/Browser/Confirmations/RowComponents.js';

const RECIPIENT = '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb';
const AMOUNT = '1';

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
});
