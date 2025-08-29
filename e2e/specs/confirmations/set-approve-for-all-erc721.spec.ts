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
import { setupMockRequest } from '../../api-mocking/mockHelpers';
import { Mockttp } from 'mockttp';

describe(SmokeConfirmations('ERC721 token'), () => {
  const NFT_CONTRACT = SMART_CONTRACTS.NFTS;

  it('approve all ERC721 tokens', async () => {
    const testSpecificMock = async (mockServer: Mockttp) => {
      const { urlEndpoint, response } =
        mockEvents.GET.remoteFeatureFlagsOldConfirmations;
      const { urlEndpoint: gasUrlEndpoint, response: gasResponse } =
        mockEvents.GET.suggestedGasFeesApiGanache;
      await setupMockRequest(mockServer, {
        requestMethod: 'GET',
        url: urlEndpoint,
        response,
        responseCode: 200,
      });
      await setupMockRequest(mockServer, {
        requestMethod: 'GET',
        url: gasUrlEndpoint,
        response: gasResponse,
        responseCode: 200,
      });
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
        smartContracts: [NFT_CONTRACT],
        testSpecificMock,
      },
      async ({ contractRegistry }) => {
        const nftsAddress = await contractRegistry?.getContractAddress(
          NFT_CONTRACT,
        );
        await loginToApp();

        // Navigate to the browser screen
        await TabBarComponent.tapBrowser();
        await TestDApp.navigateToTestDappWithContract({
          contractAddress: nftsAddress,
        });

        // Set approval for all NFTs
        await TestDApp.tapNFTSetApprovalForAllButton();
        await Assertions.expectTextDisplayed(
          ContractApprovalBottomSheetSelectorsText.APPROVE,
        );

        // Tap approve button
        await ContractApprovalBottomSheet.tapApproveButton();

        // Navigate to the activity screen
        await TabBarComponent.tapActivity();

        // Assert that the ERC721 activity is an set approve for all and it is confirmed
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
