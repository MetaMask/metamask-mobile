import { RegressionConfirmations } from '../../tags';
import { loginToApp, navigateToBrowserView } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestDApp from '../../pages/Browser/TestDApp';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import { ActivitiesViewSelectorsText } from '../../../app/components/Views/ActivityView/ActivitiesView.testIds';
import Assertions from '../../../tests/framework/Assertions';
import { ContractApprovalBottomSheetSelectorsText } from '../../../app/components/Views/confirmations/legacy/components/ContractApprovalBottomSheet.testIds';
import ContractApprovalBottomSheet from '../../pages/Browser/ContractApprovalBottomSheet';
import {
  AnvilPort,
  buildPermissions,
} from '../../../tests/framework/fixtures/FixtureUtils';
import { DappVariants } from '../../../tests/framework/Constants';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../tests/api-mocking/helpers/remoteFeatureFlagsHelper';
import { oldConfirmationsRemoteFeatureFlags } from '../../../tests/api-mocking/mock-responses/feature-flags-mocks';
import { LocalNode } from '../../../tests/framework/types';
import { AnvilManager } from '../../../tests/seeder/anvil-manager';

describe.skip(RegressionConfirmations('ERC1155 token'), () => {
  const ERC1155_CONTRACT = SMART_CONTRACTS.ERC1155;

  it('approve all ERC1155 tokens', async () => {
    const testSpecificMock = async (mockServer: Mockttp) => {
      await setupRemoteFeatureFlagsMock(
        mockServer,
        Object.assign({}, ...oldConfirmationsRemoteFeatureFlags),
      );
    };

    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: ({ localNodes }: { localNodes?: LocalNode[] }) => {
          const node = localNodes?.[0] as unknown as AnvilManager;
          const rpcPort =
            node instanceof AnvilManager
              ? (node.getPort() ?? AnvilPort())
              : undefined;

          return new FixtureBuilder()
            .withNetworkController({
              providerConfig: {
                chainId: '0x539',
                rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
                type: 'custom',
                nickname: 'Local RPC',
                ticker: 'ETH',
              },
            })
            .withPermissionControllerConnectedToTestDapp(
              buildPermissions(['0x539']),
            )
            .build();
        },
        restartDevice: true,
        smartContracts: [ERC1155_CONTRACT],
        testSpecificMock,
      },
      async ({ contractRegistry }) => {
        const erc1155Address =
          await contractRegistry?.getContractAddress(ERC1155_CONTRACT);
        await loginToApp();

        // Navigate to the browser screen
        await navigateToBrowserView();
        await TestDApp.navigateToTestDappWithContract({
          contractAddress: erc1155Address,
        });

        // Set approval for all ERC1155 tokens
        await TestDApp.tapERC1155SetApprovalForAllButton();
        await Assertions.expectTextDisplayed(
          ContractApprovalBottomSheetSelectorsText.APPROVE,
        );

        // Tap approve button
        await ContractApprovalBottomSheet.tapApproveButton();

        // Navigate to the activity screen
        await TabBarComponent.tapActivity();

        // Assert that the ERC1155 activity is an set approve for all and it is confirmed
        await Assertions.expectTextDisplayed(
          ActivitiesViewSelectorsText.SET_APPROVAL_FOR_ALL_METHOD,
        );
        await Assertions.expectTextDisplayed(
          ActivitiesViewSelectorsText.CONFIRM_TEXT,
        );
      },
    );
  });
});
