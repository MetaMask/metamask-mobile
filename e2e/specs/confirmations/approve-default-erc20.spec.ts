import { SmokeConfirmations } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';

import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import { ContractApprovalBottomSheetSelectorsText } from '../../selectors/Browser/ContractApprovalBottomSheet.selectors';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';

import ContractApprovalBottomSheet from '../../pages/Browser/ContractApprovalBottomSheet';
import Assertions from '../../framework/Assertions';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestDApp from '../../pages/Browser/TestDApp';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import { buildPermissions } from '../../framework/fixtures/FixtureUtils';
import { DappVariants } from '../../framework/Constants';
import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../api-mocking/mockHelpers';

const HST_CONTRACT = SMART_CONTRACTS.HST;
const EXPECTED_TOKEN_AMOUNT = '7';

describe(SmokeConfirmations('ERC20 tokens'), () => {
  it('approve default ERC20 token amount from a dapp', async () => {
    const testSpecificMock = async (mockServer: Mockttp) => {
      const { urlEndpoint: gasUrlEndpoint, response: gasResponse } =
        mockEvents.GET.suggestedGasFeesApiGanache;
      await setupMockRequest(mockServer, {
        requestMethod: 'GET',
        url: gasUrlEndpoint,
        response: gasResponse,
        responseCode: 200,
      });
      const { urlEndpoint, response } =
        mockEvents.GET.remoteFeatureFlagsOldConfirmations;
      await setupMockRequest(mockServer, {
        requestMethod: 'GET',
        url: urlEndpoint,
        response,
        responseCode: 200,
      });
    };

    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPermissionControllerConnectedToTestDapp(
            buildPermissions(['0x539']),
          )
          .build(),
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
        const hstAddress = await contractRegistry?.getContractAddress(
          HST_CONTRACT,
        );
        await loginToApp();
        // Navigate to the browser screen
        await TabBarComponent.tapBrowser();
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
