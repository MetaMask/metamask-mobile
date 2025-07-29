import { SmokeNetworkAbstractions } from '../../tags';
import TestHelpers from '../../helpers';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';

import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestDApp from '../../pages/Browser/TestDApp';
import Assertions from '../../framework/Assertions';
import AssetWatchBottomSheet from '../../pages/Transactions/AssetWatchBottomSheet';
import WalletView from '../../pages/wallet/WalletView';
import { buildPermissions } from '../../fixtures/utils';
import { DappVariants } from '../../framework/Constants';

const ERC20_CONTRACT = SMART_CONTRACTS.HST;

// TODO: Fix this test and remove the skip
// More info: https://github.com/MetaMask/metamask-mobile/issues/12501
describe(SmokeNetworkAbstractions('Asset Watch:'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
    await TestHelpers.reverseServerPort();
  });

  it('Should Import ERC20 Token via Dapp', async () => {
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
        smartContracts: [ERC20_CONTRACT],
      },
      async ({ contractRegistry }) => {
        const hstAddress = await contractRegistry?.getContractAddress(
          ERC20_CONTRACT,
        );
        await loginToApp();

        // Navigate to the browser screen
        await TabBarComponent.tapBrowser();
        await TestDApp.navigateToTestDappWithContract({
          contractAddress: hstAddress,
        });

        await TestDApp.tapAddERC20TokenToWalletButton();
        await Assertions.expectElementToBeVisible(
          AssetWatchBottomSheet.container,
        );
        await AssetWatchBottomSheet.tapAddTokenButton();
        await Assertions.expectElementToNotBeVisible(
          AssetWatchBottomSheet.container,
        );

        await TabBarComponent.tapWallet();
        await Assertions.expectElementToBeVisible(
          WalletView.tokenInWallet('100 TST'),
        );
      },
    );
  });
});
