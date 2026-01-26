import { RegressionConfirmations } from '../../../tags';
import { loginToApp, navigateToBrowserView } from '../../../viewHelper';
import FixtureBuilder from '../../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../tests/framework/fixtures/FixtureHelper';
import { SMART_CONTRACTS } from '../../../../app/util/test/smart-contracts';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import TestDApp from '../../../pages/Browser/TestDApp';
import Assertions from '../../../../tests/framework/Assertions';
import { buildPermissions } from '../../../../tests/framework/fixtures/FixtureUtils';
import { NETWORK_TEST_CONFIGS } from '../../../resources/mock-configs';
import { DappVariants } from '../../../../tests/framework/Constants';
import TestHelpers from '../../../helpers';

const HST_CONTRACT = SMART_CONTRACTS.HST;
describe.skip(RegressionConfirmations('ERC20 tokens'), () => {
  // Table-driven tests for all networks
  for (const networkConfig of NETWORK_TEST_CONFIGS) {
    it(`send an ERC20 token from a dapp using ${networkConfig.name} (local)`, async () => {
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
          smartContracts: [HST_CONTRACT],
          testSpecificMock: networkConfig.testSpecificMock,
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
          await TestHelpers.delay(3000);

          // Transfer ERC20 tokens
          await TestDApp.tapERC20TransferButton();
          await TestHelpers.delay(3000);

          // Accept confirmation
          await TestDApp.tapConfirmButton();
          await TestHelpers.delay(3000);

          // Check activity tab
          await TabBarComponent.tapActivity();
          await Assertions.expectTextDisplayed('Confirmed');
        },
      );
    });
  }
});
