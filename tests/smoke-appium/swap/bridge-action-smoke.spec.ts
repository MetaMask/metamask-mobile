import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { LocalNode, LocalNodeType } from '../../framework/types.js';
import { runEthToBaseBridgeFlow } from '../../flows/swap.flow.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { SmokeSwap } from '../../tags.js';
import Assertions from '../../framework/Assertions.js';
import {
  testSpecificMock,
  createBridgeQuoteStatusManagerMock,
} from '../../helpers/swap/bridge-mocks.js';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils.js';
import {
  AnvilManager,
  DEFAULT_ANVIL_PORT,
} from '../../seeder/anvil-manager.js';
import { setupSmartTransactionsMocks } from '../../helpers/swap/smart-transactions-mocks.js';
import { bridgeActionAnalyticsExpectations } from '../../helpers/analytics/expectations/bridge-action-smoke.analytics.js';
import { collectSeenProxiedRequests } from '../../api-mocking/helpers/mockHelpers.js';

/** Fixture builder shared by the bridge tests in this file: ETH on a local Anvil "Mainnet". */
function buildEthMainnetFixture({ localNodes }: { localNodes?: LocalNode[] }) {
  const node = localNodes?.[0] as unknown as AnvilManager;
  const rpcPort =
    node instanceof AnvilManager ? (node.getPort() ?? AnvilPort()) : undefined;

  return new FixtureBuilder()
    .withMetaMetricsOptIn()
    .withNetworkController({
      chainId: '0x1',
      rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
      type: 'custom',
      nickname: 'Localhost',
      ticker: 'ETH',
    })
    .build();
}

const ANVIL_MAINNET_LOCAL_NODE_OPTIONS = [
  {
    type: LocalNodeType.anvil,
    options: {
      chainId: 1,
    },
  },
];

appiumTest.describe(SmokeSwap('Bridge functionality'), () => {
  appiumTest.describe.configure({ timeout: 180000 });

  appiumTest(
    'should bridge ETH (Mainnet) to ETH (Base Network)',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: buildEthMainnetFixture,
          localNodeOptions: ANVIL_MAINNET_LOCAL_NODE_OPTIONS,
          testSpecificMock: async (mockServer) => {
            await testSpecificMock(mockServer);
            await setupSmartTransactionsMocks(mockServer, DEFAULT_ANVIL_PORT);
          },
          restartDevice: true,
          analyticsExpectations: bridgeActionAnalyticsExpectations,
          currentDeviceDetails,
        },
        async () => {
          await runEthToBaseBridgeFlow('Base');
        },
      );
    },
  );

  appiumTest.describe('bridgeQuoteStatusManager', () => {
    appiumTest(
      'fetches bridge status via getQuoteStatus instead of getTxStatus when the flag is enabled and the quote has a quoteId',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: buildEthMainnetFixture,
            localNodeOptions: ANVIL_MAINNET_LOCAL_NODE_OPTIONS,
            testSpecificMock: async (mockServer) => {
              await createBridgeQuoteStatusManagerMock()(mockServer);
              await setupSmartTransactionsMocks(mockServer, DEFAULT_ANVIL_PORT);
            },
            restartDevice: true,
            currentDeviceDetails,
          },
          async ({ mockServer }) => {
            if (!mockServer) {
              throw new Error(
                'Mock server is not defined, check testSpecificMock setup',
              );
            }

            await runEthToBaseBridgeFlow('Base');

            const seen = await collectSeenProxiedRequests(mockServer);
            const getQuoteStatusRequests = seen.filter((request) =>
              request.proxiedUrl.includes('getQuoteStatus'),
            );
            const getTxStatusRequests = seen.filter((request) =>
              request.proxiedUrl.includes('getTxStatus'),
            );

            await Assertions.checkIfArrayHasMinLength(
              getQuoteStatusRequests,
              1,
            );
            await Assertions.checkIfArrayHasLength(getTxStatusRequests, 0);
          },
        );
      },
    );

    appiumTest(
      'falls back to getTxStatus when getQuoteStatus has no submitted status yet',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: buildEthMainnetFixture,
            localNodeOptions: ANVIL_MAINNET_LOCAL_NODE_OPTIONS,
            testSpecificMock: async (mockServer) => {
              await createBridgeQuoteStatusManagerMock({})(mockServer);
              await setupSmartTransactionsMocks(mockServer, DEFAULT_ANVIL_PORT);
            },
            restartDevice: true,
            currentDeviceDetails,
          },
          async ({ mockServer }) => {
            if (!mockServer) {
              throw new Error(
                'Mock server is not defined, check testSpecificMock setup',
              );
            }

            await runEthToBaseBridgeFlow('Base');

            const seen = await collectSeenProxiedRequests(mockServer);
            const getQuoteStatusRequests = seen.filter((request) =>
              request.proxiedUrl.includes('getQuoteStatus'),
            );
            const getTxStatusRequests = seen.filter((request) =>
              request.proxiedUrl.includes('getTxStatus'),
            );

            await Assertions.checkIfArrayHasMinLength(
              getQuoteStatusRequests,
              1,
            );
            await Assertions.checkIfArrayHasMinLength(getTxStatusRequests, 1);
          },
        );
      },
    );
  });
});
