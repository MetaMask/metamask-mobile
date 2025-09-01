import { SmokeConfirmationsRedesigned } from '../../tags';
import { loginToApp } from '../../viewHelper';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { buildPermissions } from '../../framework/fixtures/FixtureUtils';
import {
  SEND_ETH_SIMULATION_MOCK,
  SIMULATION_ENABLED_NETWORKS_MOCK,
} from '../../api-mocking/mock-responses/simulations';
import Assertions from '../../framework/Assertions';
import WalletView from '../../pages/wallet/WalletView';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import ConfirmationUITypes from '../../pages/Browser/Confirmations/ConfirmationUITypes';
import FooterActions from '../../pages/Browser/Confirmations/FooterActions';
import SendView from '../../pages/Send/SendView';
import AmountView from '../../pages/Send/AmountView';
import RowComponents from '../../pages/Browser/Confirmations/RowComponents';
import { Mockttp } from 'mockttp';
import {
  setupMockRequest,
  setupMockPostRequest,
} from '../../api-mocking/helpers/mockHelpers';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { confirmationsRedesignedFeatureFlags } from '../../api-mocking/mock-responses/feature-flags-mocks';

const RECIPIENT = '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb';
const AMOUNT = '1';

// Quarantining for GNS feature
// Original path e2e/specs/confirmations-redesigned/transactions/wallet-initiated-transfer.spec.ts
// Failing on IOS, Passes on Android
describe(SmokeConfirmationsRedesigned('Wallet Initiated Transfer'), () => {
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

    const {
      urlEndpoint: simulationEndpoint,
      requestBody,
      response: simulationResponse,
      ignoreFields,
    } = SEND_ETH_SIMULATION_MOCK;

    await setupMockPostRequest(
      mockServer,
      simulationEndpoint,
      requestBody,
      simulationResponse,
      {
        statusCode: 200,
        ignoreFields,
      },
    );
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
        testSpecificMock,
      },
      async () => {
        await loginToApp();

        await WalletView.tapWalletSendButton();

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
});
