import { RegressionConfirmations } from '../../tags';
import {
  loginToApp,
  navigateToBrowserView,
} from '../../page-objects/viewHelper.ts';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';

import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import { ContractApprovalBottomSheetSelectorsText } from '../../../app/components/Views/confirmations/legacy/components/ContractApprovalBottomSheet.testIds';
import { ActivitiesViewSelectorsText } from '../../../app/components/Views/ActivityView/ActivitiesView.testIds';

import ContractApprovalBottomSheet from '../../page-objects/Browser/ContractApprovalBottomSheet';
import Assertions from '../../framework/Assertions';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import TestDApp from '../../page-objects/Browser/TestDApp';
import {
  buildPermissions,
  AnvilPort,
} from '../../framework/fixtures/FixtureUtils';
import { DappVariants } from '../../framework/Constants';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { oldConfirmationsRemoteFeatureFlags } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { LocalNode } from '../../framework/types';
import { AnvilManager } from '../../seeder/anvil-manager';

const HST_CONTRACT = SMART_CONTRACTS.HST;
const EXPECTED_TOKEN_AMOUNT = '7';

describe(RegressionConfirmations('ERC20 tokens'), () => {
  it('approve default ERC20 token amount from a dapp', async () => {
    const testSpecificMock = async (mockServer: Mockttp) => {
      await setupRemoteFeatureFlagsMock(
        mockServer,
        Object.assign({}, ...oldConfirmationsRemoteFeatureFlags),
      );
    };

    await withFixtures(
      {
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
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        restartDevice: true,
        smartContracts: [HST_CONTRACT],
        testSpecificMock,
      },
      async ({ contractRegistry }) => {
        const hstAddress =
          await contractRegistry?.getContractAddress(HST_CONTRACT);
        await loginToApp();
        // Navigate to the browser screen
        await navigateToBrowserView();
        await TestDApp.navigateToTestDappWithContract({
          contractAddress: hstAddress,
        });
        await TestDApp.tapApproveERC20TokensButton();

        await Assertions.expectElementToBeVisible(
          ContractApprovalBottomSheet.approveTokenAmount,
        );

        await Assertions.expectElementToHaveText(
          ContractApprovalBottomSheet.approveTokenAmount,
          EXPECTED_TOKEN_AMOUNT,
        );
        // Tap next button
        await Assertions.expectTextDisplayed(
          ContractApprovalBottomSheetSelectorsText.NEXT,
        );
        await ContractApprovalBottomSheet.tapNextButton();

        await Assertions.expectTextDisplayed(
          ContractApprovalBottomSheetSelectorsText.APPROVE,
        );
        // Tap approve button
        await ContractApprovalBottomSheet.tapApproveButton();

        // Navigate to the activity screen
        await TabBarComponent.tapActivity();

        // Assert erc20 is approved

        await Assertions.expectTextDisplayed(
          ActivitiesViewSelectorsText.CONFIRM_TEXT,
        );
      },
    );
  });
});
