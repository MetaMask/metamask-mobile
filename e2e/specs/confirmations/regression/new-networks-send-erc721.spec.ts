import { Regression } from '../../../tags';
import { loginToApp } from '../../../viewHelper';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import TestDApp from '../../../pages/Browser/TestDApp';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import { SMART_CONTRACTS } from '../../../../app/util/test/smart-contracts';
import { ActivitiesViewSelectorsText } from '../../../selectors/Transactions/ActivitiesView.selectors';
import Assertions from '../../../framework/Assertions';
import { buildPermissions } from '../../../fixtures/utils';
import { NETWORK_TEST_CONFIGS } from '../../../resources/mock-configs';
import { DappVariants } from '../../../framework/Constants';
import TestHelpers from '../../../helpers';

describe(Regression('ERC721 tokens'), () => {
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
          const nftsAddress = await contractRegistry?.getContractAddress(
            NFT_CONTRACT,
          );

          await loginToApp();

          // Navigate to the browser screen
          await TabBarComponent.tapBrowser();
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
