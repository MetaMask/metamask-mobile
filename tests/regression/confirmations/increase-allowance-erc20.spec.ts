import { RegressionConfirmations } from '../../tags';
import {
  loginToApp,
  navigateToBrowserView,
} from '../../page-objects/viewHelper.ts';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import TestDApp from '../../page-objects/Browser/TestDApp';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import ContractApprovalBottomSheet from '../../page-objects/Browser/ContractApprovalBottomSheet';
import Assertions from '../../framework/Assertions';
import { ActivitiesViewSelectorsText } from '../../../app/components/Views/ActivityView/ActivitiesView.testIds';
import {
  buildPermissions,
  AnvilPort,
} from '../../framework/fixtures/FixtureUtils';
import { DappVariants } from '../../framework/Constants';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { oldConfirmationsRemoteFeatureFlags } from '../../api-mocking/mock-responses/feature-flags-mocks';
import NetworkListModal from '../../page-objects/Network/NetworkListModal';
import WalletView from '../../page-objects/wallet/WalletView';
import { LocalNode } from '../../framework/types';
import { AnvilManager } from '../../seeder/anvil-manager';

const HST_CONTRACT = SMART_CONTRACTS.HST;

describe(RegressionConfirmations('ERC20 - Increase Allowance'), () => {
  it('from a dApp', async () => {
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
        await TestDApp.tapIncreaseAllowanceButton();

        //Input custom token amount
        await Assertions.expectElementToBeVisible(
          ContractApprovalBottomSheet.approveTokenAmount,
        );
        await ContractApprovalBottomSheet.clearInput();
        await ContractApprovalBottomSheet.inputCustomAmount('2');

        // Assert that custom token amount is shown
        await Assertions.expectElementToHaveText(
          ContractApprovalBottomSheet.approveTokenAmount,
          '2',
        );
        // Tap next button
        await ContractApprovalBottomSheet.tapNextButton();

        // Tap approve button
        await ContractApprovalBottomSheet.tapApproveButton();

        // Navigate to the activity screen
        await TabBarComponent.tapActivity();

        await WalletView.tapTokenNetworkFilter();
        await NetworkListModal.tapOnCustomTab();
        await NetworkListModal.changeNetworkTo('Localhost');

        // Assert that the ERC20 activity is an increase allowance and it is confirmed
        await Assertions.expectTextDisplayed(
          ActivitiesViewSelectorsText.INCREASE_ALLOWANCE_METHOD,
        );
        await Assertions.expectTextDisplayed(
          ActivitiesViewSelectorsText.CONFIRM_TEXT,
        );
      },
    );
  });
});
