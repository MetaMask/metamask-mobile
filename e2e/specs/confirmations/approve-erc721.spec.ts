import { SmokeConfirmations } from '../../tags';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestDApp from '../../pages/Browser/TestDApp';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { DappVariants } from '../../framework/Constants';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import Assertions from '../../framework/Assertions';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import { buildPermissions } from '../../fixtures/utils';

describe(SmokeConfirmations('ERC721 tokens'), () => {
  const NFT_CONTRACT = SMART_CONTRACTS.NFTS;

  it('approve an ERC721 token from a dapp', async () => {
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
        // Approve NFT
        await TestDApp.tapApproveERC721TokenButton();
        await TestDApp.tapApproveButton();
        // Navigate to the activity screen
        await TabBarComponent.tapActivity();
        // Assert NFT is approved
        await Assertions.expectTextDisplayed(
          ActivitiesViewSelectorsText.CONFIRM_TEXT,
        );
      },
    );
  });
});
