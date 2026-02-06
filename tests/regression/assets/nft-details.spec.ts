import { RegressionAssets } from '../../../e2e/tags';
import TestHelpers from '../../../e2e/helpers';
import { loginToApp } from '../../../e2e/viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import WalletView from '../../../e2e/pages/wallet/WalletView';
import ImportNFTView from '../../../e2e/pages/wallet/ImportNFTFlow/ImportNFTView';
import Assertions from '../../framework/Assertions';
import enContent from '../../../locales/languages/en.json';
import {
  AnvilPort,
  buildPermissions,
} from '../../framework/fixtures/FixtureUtils';
import { DappVariants } from '../../framework/Constants';
import { LocalNode } from '../../framework';
import { AnvilManager } from '../../seeder/anvil-manager';

describe.skip(RegressionAssets('NFT Details page'), () => {
  const NFT_CONTRACT = SMART_CONTRACTS.NFTS;
  const TEST_DAPP_CONTRACT = 'TestDappNFTs';
  beforeAll(async () => {
    jest.setTimeout(170000);
    await TestHelpers.reverseServerPort();
  });

  it('show nft details', async () => {
    await withFixtures(
      {
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
              buildPermissions(['0x539']),
            )
            .build();
        },
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        restartDevice: true,
        smartContracts: [NFT_CONTRACT],
      },
      async ({ contractRegistry }) => {
        const nftsAddress =
          await contractRegistry?.getContractAddress(NFT_CONTRACT);

        await loginToApp();

        await WalletView.tapNftTab();
        await WalletView.scrollDownOnNFTsTab();

        await WalletView.tapImportNFTButton();
        await Assertions.expectElementToBeVisible(ImportNFTView.container);
        await ImportNFTView.typeInNFTAddress('1234');
        await ImportNFTView.typeInNFTIdentifier('');
        await Assertions.expectElementToBeVisible(
          ImportNFTView.addressWarningMessage,
        );
        //await ImportNFTView.tapBackButton();

        await ImportNFTView.typeInNFTAddress(nftsAddress);
        await ImportNFTView.typeInNFTIdentifier('1');

        await Assertions.expectElementToBeVisible(WalletView.container);
        // Wait for asset to load
        await Assertions.expectElementToBeVisible(
          WalletView.nftInWallet(TEST_DAPP_CONTRACT),
        );
        await WalletView.tapOnNftName();

        await Assertions.expectTextDisplayed(enContent.nft_details.token_id);
        await Assertions.expectTextDisplayed(
          enContent.nft_details.contract_address,
        );
        await Assertions.expectTextDisplayed(
          enContent.nft_details.token_standard,
        );
      },
    );
  });
});
