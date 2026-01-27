import { RegressionConfirmations } from '../../../tags';
import { loginToApp, navigateToBrowserView } from '../../../viewHelper';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import TestDApp from '../../../pages/Browser/TestDApp';
import FixtureBuilder from '../../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../tests/framework/fixtures/FixtureHelper';
import { SMART_CONTRACTS } from '../../../../app/util/test/smart-contracts';
import { ActivitiesViewSelectorsText } from '../../../../app/components/Views/ActivityView/ActivitiesView.testIds';
import Assertions from '../../../../tests/framework/Assertions';
import { buildPermissions } from '../../../../tests/framework/fixtures/FixtureUtils';
import { NETWORK_TEST_CONFIGS } from '../../../../tests/resources/mock-configs';
import { DappVariants } from '../../../../tests/framework/Constants';
import TestHelpers from '../../../helpers';

describe.skip(RegressionConfirmations('ERC721 tokens'), () => {
  const NFT_CONTRACT = SMART_CONTRACTS.NFTS;

  // Table-driven tests for all networks
  for (const networkConfig of NETWORK_TEST_CONFIGS) {
    it(`send an ERC721 token from a dapp using ${networkConfig.name} (local)`, async () => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
            },
          ],
          fixture: new FixtureBuilder()
            .withNetworkController({
              providerConfig: networkConfig.providerConfig,
            })
            .withPermissionControllerConnectedToTestDapp(
              buildPermissions(networkConfig.permissions),
            )
            .build(),
          restartDevice: true,
          smartContracts: [NFT_CONTRACT],
          // ganacheOptions: networkConfig.ganacheOptions,
          testSpecificMock: networkConfig.testSpecificMock,
        },
        // Remove any once withFixtures is typed
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async ({ contractRegistry }) => {
          const nftsAddress =
            await contractRegistry?.getContractAddress(NFT_CONTRACT);

          await loginToApp();

          // Navigate to the browser screen
          await navigateToBrowserView();
          await TestDApp.navigateToTestDappWithContract({
            contractAddress: nftsAddress,
          });

          // Transfer NFT
          await TestDApp.tapNFTTransferButton();
          await TestHelpers.delay(3000);

          // Accept confirmation
          await TestDApp.tapConfirmButton();
          await TestHelpers.delay(3000);

          // Check activity tab
          await TabBarComponent.tapActivity();
          await Assertions.expectTextDisplayed('Confirmed');
          await Assertions.expectTextDisplayed(
            ActivitiesViewSelectorsText.SENT_COLLECTIBLE_MESSAGE_TEXT,
          );
        },
      );
    });
  }
});
