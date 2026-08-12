import { test as appiumTest } from '../../../framework/fixtures/playwright/index.js';
import { SmokeConfirmations } from '../../../tags.js';
import { loginToAppPlaywright } from '../../../flows/wallet.flow.js';
import {
  navigateToTestDappAndTap,
  confirmCloseAndAssertActivity,
} from '../../../flows/confirmations.flow.js';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.js';
import Assertions from '../../../framework/Assertions.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import {
  buildPermissions,
  AnvilPort,
  getDappUrlForFixture,
} from '../../../framework/fixtures/FixtureUtils.js';
import RowComponents from '../../../page-objects/Browser/Confirmations/RowComponents.js';
import { SIMULATION_ENABLED_NETWORKS_MOCK } from '../../../api-mocking/mock-responses/simulations.js';
import { TestDappSelectorsWebIDs } from '../../../selectors/Browser/TestDapp.selectors.js';
import { DappVariants } from '../../../framework/Constants.js';
import { setupMockRequest } from '../../../api-mocking/helpers/mockHelpers.js';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { confirmationFeatureFlags } from '../../../api-mocking/mock-responses/feature-flags-mocks.js';
import { LocalNode, LocalNodeType } from '../../../framework/types.js';
import { AnvilManager } from '../../../seeder/anvil-manager.js';

const CONTRACT_DEPLOYMENT_ACTIVITY = 'Contract deployment';

function buildContractDeploymentFixture({
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
    .withPermissionControllerConnectedToTestDapp(buildPermissions(['0x539']))
    .build();

  fixture.state.browser.tabs[0].url = getDappUrlForFixture(0);

  return fixture;
}

const testSpecificMock = async (mockServer: Mockttp) => {
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: SIMULATION_ENABLED_NETWORKS_MOCK.urlEndpoint,
    response: SIMULATION_ENABLED_NETWORKS_MOCK.response,
    responseCode: 200,
  });
  await setupRemoteFeatureFlagsMock(
    mockServer,
    Object.assign({}, ...confirmationFeatureFlags),
  );
};

appiumTest.describe(SmokeConfirmations('Contract Deployment'), () => {
  appiumTest.describe.configure({ timeout: 2500000 });

  appiumTest(
    'deploys a contract',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
            },
          ],
          fixture: buildContractDeploymentFixture,
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
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          await navigateToTestDappAndTap(
            TestDappSelectorsWebIDs.DEPLOY_CONTRACT_BUTTON_ID,
            'Deploy contract button',
          );

          await Assertions.expectElementToExist(RowComponents.AccountNetwork, {
            description: 'Account Network',
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

          await confirmCloseAndAssertActivity(CONTRACT_DEPLOYMENT_ACTIVITY);
        },
      );
    },
  );
});
