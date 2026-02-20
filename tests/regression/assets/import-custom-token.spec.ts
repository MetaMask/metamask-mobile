import { RegressionAssets } from '../../../e2e/tags';
import TestHelpers from '../../../e2e/helpers';
import WalletView from '../../../e2e/pages/wallet/WalletView';
import ConfirmAddAssetView from '../../../e2e/pages/wallet/ImportTokenFlow/ConfirmAddAsset';
import ImportTokensView from '../../../e2e/pages/wallet/ImportTokenFlow/ImportTokensView';
import Assertions from '../../framework/Assertions';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { loginToApp } from '../../../e2e/viewHelper';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils';
import { LocalNode } from '../../framework';
import { AnvilManager } from '../../seeder/anvil-manager';

describe(RegressionAssets('Import custom token'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.launchApp();
  });

  it('should Import custom token with auto-population', async () => {
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
            .withNetworkEnabledMap({
              eip155: { '0x539': true },
            })
            .build();
        },
        restartDevice: true,
        smartContracts: [SMART_CONTRACTS.HST],
      },
      async ({ contractRegistry }) => {
        const hstAddress = await contractRegistry?.getContractAddress(
          SMART_CONTRACTS.HST,
        );

        await loginToApp();
        await WalletView.tapImportTokensButton();
        await ImportTokensView.typeTokenAddress(hstAddress);
        await new Promise((resolve) => setTimeout(resolve, 20000));
        await Assertions.expectElementToHaveText(
          ImportTokensView.symbolInput,
          'TST',
          {
            timeout: 5000,
            description: 'Symbol field should auto-populate with TST',
          },
        );
        await ImportTokensView.tapOnNextButton('Import Token');
        await ConfirmAddAssetView.tapOnConfirmButton();
        await Assertions.expectElementToBeVisible(
          WalletView.tokenInWallet('100 TST'),
        );
      },
    );
  });
});
