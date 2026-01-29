import { RegressionNetworkAbstractions } from '../../tags';
import TestHelpers from '../../helpers';
import { loginToApp, navigateToBrowserView } from '../../viewHelper';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
} from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestDApp from '../../pages/Browser/TestDApp';
import Assertions from '../../../tests/framework/Assertions';
import AssetWatchBottomSheet from '../../pages/Transactions/AssetWatchBottomSheet';
import WalletView from '../../pages/wallet/WalletView';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import {
  AnvilPort,
  buildPermissions,
} from '../../../tests/framework/fixtures/FixtureUtils';
import { DappVariants } from '../../../tests/framework/Constants';
import {
  setEthAccounts,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';
import { LocalNode } from '../../../tests/framework/types';
import { AnvilManager } from '../../../tests/seeder/anvil-manager';

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
              buildERC20PermsForAddress(),
            )
            .build();
        },
        restartDevice: true,
        smartContracts: [ERC20_CONTRACT],
      },
      async ({ contractRegistry }) => {
        const hstAddress =
          await contractRegistry?.getContractAddress(ERC20_CONTRACT);
        await loginToApp();

        // Navigate to the browser screen
        await navigateToBrowserView();
        await TestDApp.navigateToTestDappWithContract({
          contractAddress: hstAddress,
        });

        await TestDApp.tapAddERC20TokenToWalletButton();
        await Assertions.expectElementToBeVisible(
          AssetWatchBottomSheet.container,
          { timeout: 5000, description: 'asset watch sheet should appear' },
        );
        await AssetWatchBottomSheet.tapAddTokenButton();
        await Assertions.expectElementToNotBeVisible(
          AssetWatchBottomSheet.container,
        );

        await TabBarComponent.tapWallet();
        await WalletView.tapTokenNetworkFilter();
        await NetworkListModal.tapOnCustomTab();
        await NetworkListModal.changeNetworkTo('Localhost');
        await Assertions.expectElementToBeVisible(
          WalletView.tokenInWallet('100 TST'),
        );
      },
    );
  });
});
