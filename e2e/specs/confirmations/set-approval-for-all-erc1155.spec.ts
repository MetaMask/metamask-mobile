import { SmokeConfirmations } from '../../tags';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestDApp from '../../pages/Browser/TestDApp';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import Assertions from '../../framework/Assertions';
import { ContractApprovalBottomSheetSelectorsText } from '../../selectors/Browser/ContractApprovalBottomSheet.selectors';
import ContractApprovalBottomSheet from '../../pages/Browser/ContractApprovalBottomSheet';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import { buildPermissions } from '../../framework/fixtures/FixtureUtils';
import { DappVariants } from '../../framework/Constants';

describe(SmokeConfirmations('ERC1155 token'), () => {
  const ERC1155_CONTRACT = SMART_CONTRACTS.ERC1155;

  it('approve all ERC1155 tokens', async () => {
    const testSpecificMock = {
      GET: [
        mockEvents.GET.suggestedGasFeesApiGanache,
        mockEvents.GET.remoteFeatureFlagsOldConfirmations,
      ],
    };

    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPermissionControllerConnectedToTestDapp(
            buildPermissions(['0x539']),
          )
          .build(),
        restartDevice: true,
        smartContracts: [ERC1155_CONTRACT],
        testSpecificMock,
      },
      async ({ contractRegistry }) => {
        const erc1155Address = await contractRegistry?.getContractAddress(
          ERC1155_CONTRACT,
        );
        await loginToApp();

        // Navigate to the browser screen
        await TabBarComponent.tapBrowser();
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
