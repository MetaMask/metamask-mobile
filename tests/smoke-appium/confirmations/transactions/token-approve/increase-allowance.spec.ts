import { SMART_CONTRACTS } from '../../../../../app/util/test/smart-contracts.js';
import { test as appiumTest } from '../../../../framework/fixtures/playwright/index.js';
import { SmokeConfirmations } from '../../../../tags.js';
import { loginToAppPlaywright } from '../../../../flows/wallet.flow.js';
import {
  navigateToContractAndTap,
  confirmCloseAndAssertActivity,
} from '../../../../flows/confirmations.flow.js';
import FixtureBuilder from '../../../../framework/fixtures/FixtureBuilder.js';
import Assertions from '../../../../framework/Assertions.js';
import { withFixtures } from '../../../../framework/fixtures/FixtureHelper.js';
import {
  buildPermissions,
  AnvilPort,
  getDappUrlForFixture,
} from '../../../../framework/fixtures/FixtureUtils.js';
import RowComponents from '../../../../page-objects/Browser/Confirmations/RowComponents.js';
import TokenApproveConfirmation from '../../../../page-objects/Confirmation/TokenApproveConfirmation.js';
import { SIMULATION_ENABLED_NETWORKS_MOCK } from '../../../../api-mocking/mock-responses/simulations.js';
import { TestDappSelectorsWebIDs } from '../../../../selectors/Browser/TestDapp.selectors.js';
import { DappVariants } from '../../../../framework/Constants.js';
import { setupMockRequest } from '../../../../api-mocking/helpers/mockHelpers.js';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { confirmationFeatureFlags } from '../../../../api-mocking/mock-responses/feature-flags-mocks.js';
import { LocalNode, LocalNodeType } from '../../../../framework/types.js';
import { AnvilManager } from '../../../../seeder/anvil-manager.js';

const ERC_20_CONTRACT = SMART_CONTRACTS.HST;
const INCREASE_ALLOWANCE_ACTIVITY = 'Increase allowance';

function buildIncreaseAllowanceFixture({
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

// Skipped: flaky on main, confirm-button not in hierarchy. See #34581.
appiumTest.describe.skip(
  SmokeConfirmations('Token Approve - increaseAllowance method'),
  () => {
    appiumTest.describe.configure({ timeout: 2500000 });

    appiumTest(
      'creates an approve transaction confirmation for given ERC 20, changes the spending cap and submits it',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            dapps: [
              {
                dappVariant: DappVariants.TEST_DAPP,
              },
            ],
            fixture: buildIncreaseAllowanceFixture,
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
            smartContracts: [ERC_20_CONTRACT],
            currentDeviceDetails,
          },
          async ({ contractRegistry }) => {
            const erc20Address =
              await contractRegistry?.getContractAddress(ERC_20_CONTRACT);

            await loginToAppPlaywright({ scenarioType: 'e2e' });

            await navigateToContractAndTap(
              erc20Address as string,
              TestDappSelectorsWebIDs.INCREASE_ALLOWANCE_BUTTON_ID,
              'Increase allowance button',
            );

            // Existence: BottomSheet children report isDisplayed=false on iOS.
            await Assertions.expectElementToExist(
              RowComponents.AccountNetwork,
              {
                description: 'Account Network',
              },
            );
            await Assertions.expectElementToExist(RowComponents.ApproveRow, {
              description: 'Approve Row',
            });
            await Assertions.expectElementToExist(
              RowComponents.NetworkAndOrigin,
              {
                description: 'Network And Origin',
              },
            );
            await Assertions.expectElementToExist(
              RowComponents.GasFeesDetails,
              {
                description: 'Gas Fees Details',
              },
            );
            await Assertions.expectElementToExist(
              RowComponents.AdvancedDetails,
              {
                description: 'Advanced Details',
              },
            );

            await Assertions.expectElementToHaveText(
              TokenApproveConfirmation.SpendingCapValue,
              '1',
              {
                description: 'Spending Cap Value',
              },
            );

            await TokenApproveConfirmation.tapEditSpendingCapButton();
            await TokenApproveConfirmation.inputSpendingCap('5');
            await TokenApproveConfirmation.tapEditSpendingCapSaveButton();
            await Assertions.expectElementToHaveText(
              TokenApproveConfirmation.SpendingCapValue,
              '5',
              {
                description: 'Updated Spending Cap Value',
              },
            );

            await confirmCloseAndAssertActivity(INCREASE_ALLOWANCE_ACTIVITY);
          },
        );
      },
    );
  },
);
