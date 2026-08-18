import { test as appiumTest } from '../../../framework/fixtures/playwright/index.js';
import { SmokeConfirmations } from '../../../tags.js';
import { loginToAppPlaywright } from '../../../flows/wallet.flow.js';
import {
  confirmCloseAndAssertActivity,
  navigateToTestDappAndTap,
} from '../../../flows/confirmations.flow.js';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.js';
import Assertions from '../../../framework/Assertions.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import {
  AnvilPort,
  buildPermissions,
  getDappUrlForFixture,
} from '../../../framework/fixtures/FixtureUtils.js';
import RowComponents from '../../../page-objects/Browser/Confirmations/RowComponents.js';
import {
  SEND_ETH_SIMULATION_MOCK,
  SIMULATION_ENABLED_NETWORKS_MOCK,
} from '../../../api-mocking/mock-responses/simulations.js';
import { TestDappSelectorsWebIDs } from '../../../selectors/Browser/TestDapp.selectors.js';
import { DappVariants } from '../../../framework/Constants.js';
import { Mockttp } from 'mockttp';
import {
  setupMockPostRequest,
  setupMockRequest,
} from '../../../api-mocking/helpers/mockHelpers.js';
import {
  SECURITY_ALERTS_BENIGN_RESPONSE,
  SECURITY_ALERTS_REQUEST_BODY,
  securityAlertsUrl,
} from '../../../api-mocking/mock-responses/security-alerts-mock.js';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { confirmationFeatureFlags } from '../../../api-mocking/mock-responses/feature-flags-mocks.js';
import { LocalNode, LocalNodeType } from '../../../framework/types.js';
import { AnvilManager } from '../../../seeder/anvil-manager.js';
import { dappInitiatedTransferAnalyticsExpectations } from '../../../helpers/analytics/expectations/dapp-initiated-transfer.analytics.js';

function buildDappInitiatedTransferFixture({
  localNodes,
}: {
  localNodes?: LocalNode[];
}) {
  const node = localNodes?.[0] as unknown as AnvilManager;
  const rpcPort =
    node instanceof AnvilManager ? (node.getPort() ?? AnvilPort()) : undefined;

  const fixture = new FixtureBuilder()
    .withNetworkController({
      chainId: '0x539',
      rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
      type: 'custom',
      nickname: 'Local RPC',
      ticker: 'ETH',
    })
    .withNetworkEnabledMap({
      eip155: { '0x539': true },
    })
    .withMetaMetricsOptIn()
    .withPermissionControllerConnectedToTestDapp(buildPermissions(['0x539']))
    .build();

  fixture.state.browser.tabs[0].url = getDappUrlForFixture(0);

  return fixture;
}

const testSpecificMock = async (mockServer: Mockttp) => {
  await setupMockPostRequest(
    mockServer,
    securityAlertsUrl('0x539'),
    SECURITY_ALERTS_REQUEST_BODY,
    SECURITY_ALERTS_BENIGN_RESPONSE,
    {
      statusCode: 201,
      ignoreFields: [
        'networkClientId',
        'id',
        'toNative',
        'origin',
        'params[0].to',
        'params[0].gas',
        'params[0].gasPrice',
      ],
    },
  );

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: SIMULATION_ENABLED_NETWORKS_MOCK.urlEndpoint,
    response: SIMULATION_ENABLED_NETWORKS_MOCK.response,
    responseCode: 200,
  });

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
  await setupRemoteFeatureFlagsMock(
    mockServer,
    Object.assign({}, ...confirmationFeatureFlags),
  );
};

// Skipped: consistently fails on main Appium confirmations Android smoke
// (`#sendEIP1559Button` never enabled; can hang the job ~35m). MMQA-2254.
appiumTest.describe.skip(SmokeConfirmations('DApp Initiated Transfer'), () => {
  appiumTest.describe.configure({ timeout: 2500000 });

  appiumTest(
    'sends native asset and validates MetaMetrics transaction events',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
            },
          ],
          fixture: buildDappInitiatedTransferFixture,
          localNodeOptions: [
            {
              type: LocalNodeType.anvil,
              options: {
                chainId: 1337,
              },
            },
          ],
          restartDevice: true,
          testSpecificMock,
          analyticsExpectations: dappInitiatedTransferAnalyticsExpectations,
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          await navigateToTestDappAndTap(
            TestDappSelectorsWebIDs.SEND_EIP_1559_BUTTON_ID,
            'Send EIP-1559 transaction button',
          );

          await Assertions.expectElementToExist(RowComponents.TokenHero, {
            description: 'Token Hero',
          });
          await Assertions.expectTextDisplayed('0 ETH', {
            description: 'Transaction amount',
          });
          await Assertions.expectElementToExist(RowComponents.FromTo, {
            description: 'From To',
          });
          await Assertions.expectElementToExist(
            RowComponents.SimulationDetails,
            {
              description: 'Simulation Details',
            },
          );
          await Assertions.expectElementToExist(RowComponents.GasFeesDetails, {
            description: 'Gas Fees Details',
          });
          await Assertions.expectElementToExist(RowComponents.AdvancedDetails, {
            description: 'Advanced Details',
          });

          await confirmCloseAndAssertActivity();
        },
      );
    },
  );
});
