import { SmokeConfirmationsRedesigned } from '../../../tags';
import TestHelpers from '../../../helpers';
import { loginToApp } from '../../../viewHelper';
import Browser from '../../../pages/Browser/BrowserView';
import FixtureBuilder from '../../../fixtures/fixture-builder';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import ConfirmationUITypes from '../../../pages/Browser/Confirmations/ConfirmationUITypes';
import FooterActions from '../../../pages/Browser/Confirmations/FooterActions';
import { mockEvents } from '../../../api-mocking/mock-config/mock-events.js';
import Assertions from '../../../utils/Assertions';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../../fixtures/fixture-helper';
import { buildPermissions } from '../../../fixtures/utils';
import RowComponents from '../../../pages/Browser/Confirmations/RowComponents';
import {
  SEND_ETH_SIMULATION_MOCK,
  SIMULATION_ENABLED_NETWORKS_MOCK,
} from '../../../api-mocking/mock-responses/simulations';
import TestDApp from '../../../pages/Browser/TestDApp';

describe(SmokeConfirmationsRedesigned('DApp Initiated Transfer'), () => {
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
        dapp: true,
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

        await TabBarComponent.tapBrowser();
        await Browser.navigateToTestDApp();
        await TestDApp.tapSendEIP1559Button();

        // Check all expected elements are visible
        await Assertions.checkIfVisible(
          ConfirmationUITypes.ModalConfirmationContainer,
        );
        await Assertions.checkIfVisible(RowComponents.TokenHero);
        await Assertions.checkIfTextIsDisplayed('0 ETH');
        await Assertions.checkIfVisible(RowComponents.FromTo);
        await Assertions.checkIfVisible(RowComponents.SimulationDetails);
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
