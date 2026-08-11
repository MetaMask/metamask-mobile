import { SMART_CONTRACTS } from '../../../../app/util/test/smart-contracts.js';
import { test as appiumTest } from '../../../framework/fixtures/playwright/index.js';
import { SmokeConfirmations } from '../../../tags.js';
import { loginToAppPlaywright } from '../../../flows/wallet.flow.js';
import {
  navigateToContractAndTap,
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
import { PlatformDetector } from '../../../framework/PlatformLocator.js';
import { AnvilManager } from '../../../seeder/anvil-manager.js';

const NFT_CONTRACT = SMART_CONTRACTS.NFTS;

function buildContractInteractionFixture({
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

appiumTest.describe(SmokeConfirmations('Contract Interaction'), () => {
  appiumTest.describe.configure({ timeout: 2500000 });

  appiumTest(
    'submits transaction',
    async ({ driver: _driver, currentDeviceDetails }) => {
      // Temporarily disabled on Android Appium confirmations smoke (failing).
      appiumTest.skip(
        PlatformDetector.isAndroid(),
        'Android Appium: contract interaction submit is failing on confirmations smoke',
      );

      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
            },
          ],
          fixture: buildContractInteractionFixture,
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
          smartContracts: [NFT_CONTRACT],
          currentDeviceDetails,
        },
        async ({ contractRegistry }) => {
          const nftsAddress =
            await contractRegistry?.getContractAddress(NFT_CONTRACT);

          await loginToAppPlaywright({ scenarioType: 'e2e' });

          await navigateToContractAndTap(
            nftsAddress as string,
            TestDappSelectorsWebIDs.ERC_721_MINT_BUTTON_ID,
            'ERC-721 mint button',
          );

          // Existence: BottomSheet children report isDisplayed=false on iOS.
          await Assertions.expectElementToExist(RowComponents.AccountNetwork, {
            description: 'Account Network',
          });
          await Assertions.expectElementToExist(
            RowComponents.SimulationDetails,
            {
              description: 'Simulation Details',
            },
          );
          await Assertions.expectElementToExist(
            RowComponents.NetworkAndOrigin,
            {
              description: 'Network And Origin',
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
