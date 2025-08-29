import { SmokeConfirmationsRedesigned } from '../../../tags';
import { loginToApp } from '../../../viewHelper';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import { buildPermissions } from '../../../framework/fixtures/FixtureUtils';
import {
  SEND_ETH_SIMULATION_MOCK,
  SIMULATION_ENABLED_NETWORKS_MOCK,
} from '../../../api-mocking/mock-responses/simulations';
import Assertions from '../../../framework/Assertions';
import WalletView from '../../../pages/wallet/WalletView';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import FooterActions from '../../../pages/Browser/Confirmations/FooterActions';
import SendView from '../../../pages/Send/SendView';
import AmountView from '../../../pages/Send/AmountView';
import {
  setupMockRequest,
  setupMockPostRequest,
} from '../../../api-mocking/helpers/mockHelpers';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { confirmationsRedesignedFeatureFlags } from '../../../api-mocking/mock-responses/feature-flags-mocks';

const RECIPIENT = '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb';

describe(SmokeConfirmationsRedesigned('Send Max Transfer'), () => {
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
        ignoreFields: ignoreFields || [],
      },
    );
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

        await WalletView.tapWalletSendButton();

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
