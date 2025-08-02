import { SmokeConfirmationsRedesigned } from '../../../tags';
import { loginToApp } from '../../../viewHelper';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import { buildPermissions } from '../../../framework/fixtures/FixtureUtils';
import {
  SEND_ETH_SIMULATION_MOCK,
  SIMULATION_ENABLED_NETWORKS_MOCK,
} from '../../../api-mocking/mock-responses/simulations';
import Assertions from '../../../framework/Assertions';
import WalletActionsBottomSheet from '../../../pages/wallet/WalletActionsBottomSheet';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { mockEvents } from '../../../api-mocking/mock-config/mock-events';
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
        testSpecificMock,
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapSendButton();

        await SendView.inputAddress(RECIPIENT);
        await SendView.tapNextButton();

        // Do double tab here to prevent flakiness
        await AmountView.tapMaxButton();
        await AmountView.tapMaxButton();

        await AmountView.tapNextButton();

        // Check all expected elements are visible
        await Assertions.expectTextDisplayed('1,000 ETH');

        // Accept confirmation
        await FooterActions.tapConfirmButton();

        // Check activity tab
        await TabBarComponent.tapActivity();
        await Assertions.expectTextDisplayed('Confirmed');
      },
    );
  });
});
