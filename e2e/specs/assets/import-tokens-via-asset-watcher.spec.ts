import { RegressionNetworkAbstractions } from '../../tags';
import TestHelpers from '../../helpers';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
} from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';

import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestDApp from '../../pages/Browser/TestDApp';
import Assertions from '../../framework/Assertions';
import AssetWatchBottomSheet from '../../pages/Transactions/AssetWatchBottomSheet';
import WalletView from '../../pages/wallet/WalletView';
import { buildPermissions } from '../../framework/fixtures/FixtureUtils';
import { DappVariants } from '../../framework/Constants';
import {
  setEthAccounts,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';

const ERC20_CONTRACT = SMART_CONTRACTS.HST;

// TODO: Fix this test and remove the skip
// More info: https://github.com/MetaMask/metamask-mobile/issues/12501
describe(RegressionNetworkAbstractions('Asset Watch:'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
    await TestHelpers.reverseServerPort();
  });

  const buildERC20PermsForAddress = () => {
    const perms = buildPermissions(['0x539']);
    perms[Caip25EndowmentPermissionName].caveats[0].value = setEthAccounts(
      perms[Caip25EndowmentPermissionName].caveats[0].value,
      [DEFAULT_FIXTURE_ACCOUNT],
    );

    return perms;
  };

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
            buildERC20PermsForAddress(),
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
