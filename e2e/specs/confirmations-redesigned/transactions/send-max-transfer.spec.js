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
import FooterActions from '../../../pages/Browser/Confirmations/FooterActions';
import SendView from '../../../pages/Send/SendView';
import AmountView from '../../../pages/Send/AmountView';

const RECIPIENT = '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb';

describe(SmokeConfirmationsRedesigned('Send Max Transfer'), () => {
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

  it('handles max native asset', async () => {
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

        // Do double tab here to prevent flakiness
        await AmountView.tapMaxButton();
        await TestHelpers.delay(2000);
        await AmountView.tapMaxButton();

        await AmountView.tapNextButton();

        // Check if the amount is displayed
        await Assertions.checkIfTextIsDisplayed('1,000 ETH');

        // Accept confirmation
        await FooterActions.tapConfirmButton();

        // Check activity tab
        await TabBarComponent.tapActivity();
        await Assertions.checkIfTextIsDisplayed('Sent ETH');
        await Assertions.checkIfTextIsDisplayed('Confirmed');
      },
    );
  });
});
