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
import { PlatformDetector } from '../../../../framework/PlatformLocator.js';
import { AnvilManager } from '../../../../seeder/anvil-manager.js';

const ERC_721_CONTRACT = SMART_CONTRACTS.NFTS;
const ERC_1155_CONTRACT = SMART_CONTRACTS.ERC1155;
const SET_APPROVAL_FOR_ALL_ACTIVITY = 'Set approval for all';

function buildSetApprovalFixture({ localNodes }: { localNodes?: LocalNode[] }) {
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

appiumTest.describe(
  SmokeConfirmations('Token Approve - setApprovalForAll method'),
  () => {
    appiumTest.describe.configure({ timeout: 2500000 });

    appiumTest(
      'creates an approve transaction confirmation for given ERC721 and submits it',
      async ({ driver: _driver, currentDeviceDetails }) => {
        // Temporarily disabled on Android Appium confirmations smoke (failing).
        appiumTest.skip(
          PlatformDetector.isAndroid(),
          'Android Appium: setApprovalForAll ERC721 is failing on confirmations smoke',
        );

        await withFixtures(
          {
            dapps: [
              {
                dappVariant: DappVariants.TEST_DAPP,
              },
            ],
            fixture: buildSetApprovalFixture,
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
            smartContracts: [ERC_721_CONTRACT],
            currentDeviceDetails,
          },
          async ({ contractRegistry }) => {
            const erc721Address =
              await contractRegistry?.getContractAddress(ERC_721_CONTRACT);

            await loginToAppPlaywright({ scenarioType: 'e2e' });

            await navigateToContractAndTap(
              erc721Address as string,
              TestDappSelectorsWebIDs.SET_APPROVAL_FOR_ALL_NFT_BUTTON_ID,
              'Set approval for all NFT button',
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
              'All',
              {
                description: 'Spending Cap Value',
              },
            );

            await confirmCloseAndAssertActivity(SET_APPROVAL_FOR_ALL_ACTIVITY);
          },
        );
      },
    );

    // Skipped: consistently fails on main Appium confirmations Android smoke
    // (`confirm-button` never appears after dapp tap). MMQA-2254 / MMQA-2232.
    appiumTest.skip(
      'creates an approve transaction confirmation for given ERC1155 and submits it',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            dapps: [
              {
                dappVariant: DappVariants.TEST_DAPP,
              },
            ],
            fixture: buildSetApprovalFixture,
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
            smartContracts: [ERC_1155_CONTRACT],
            currentDeviceDetails,
          },
          async ({ contractRegistry }) => {
            const erc1155Address =
              await contractRegistry?.getContractAddress(ERC_1155_CONTRACT);

            await loginToAppPlaywright({ scenarioType: 'e2e' });

            await navigateToContractAndTap(
              erc1155Address as string,
              TestDappSelectorsWebIDs.SET_APPROVAL_FOR_ALL_ERC1155_BUTTON_ID,
              'Set approval for all ERC-1155 button',
            );

            await Assertions.expectElementToHaveText(
              TokenApproveConfirmation.SpendingCapValue,
              'All',
              {
                description: 'Spending Cap Value',
              },
            );

            await confirmCloseAndAssertActivity(SET_APPROVAL_FOR_ALL_ACTIVITY);
          },
        );
      },
    );

    // Skipped: hard-fails on recent main Appium confirmations Android smoke
    // (`confirm-button` never appears after revoke tap). MMQA-2254 / MMQA-2232.
    appiumTest.describe.skip('revoke mode', () => {
      appiumTest(
        'creates an approve transaction confirmation for ERC 721 and submits it',
        async ({ driver: _driver, currentDeviceDetails }) => {
          await withFixtures(
            {
              dapps: [
                {
                  dappVariant: DappVariants.TEST_DAPP,
                },
              ],
              fixture: buildSetApprovalFixture,
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
              smartContracts: [ERC_721_CONTRACT],
              currentDeviceDetails,
            },
            async ({ contractRegistry }) => {
              const erc721Address =
                await contractRegistry?.getContractAddress(ERC_721_CONTRACT);

              await loginToAppPlaywright({ scenarioType: 'e2e' });

              await navigateToContractAndTap(
                erc721Address as string,
                TestDappSelectorsWebIDs.ERC_721_REVOKE_APPROVAL_BUTTON_ID,
                'ERC-721 revoke approval button',
              );

              // All means all token permissions revoked
              await Assertions.expectElementToHaveText(
                TokenApproveConfirmation.SpendingCapValue,
                'All',
                {
                  description: 'Revoke Spending Cap Value',
                },
              );

              await confirmCloseAndAssertActivity(
                SET_APPROVAL_FOR_ALL_ACTIVITY,
              );
            },
          );
        },
      );
    });
  },
);
