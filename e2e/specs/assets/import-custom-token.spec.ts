import { SmokeAssets } from '../../tags';
import TestHelpers from '../../helpers';
import WalletView from '../../pages/wallet/WalletView';
import ConfirmAddAssetView from '../../pages/wallet/ImportTokenFlow/ConfirmAddAsset';
import ImportTokensView from '../../pages/wallet/ImportTokenFlow/ImportTokensView';
import Assertions from '../../../tests/framework/Assertions';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { loginToApp } from '../../viewHelper';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import { AnvilPort } from '../../../tests/framework/fixtures/FixtureUtils';
import { LocalNode } from '../../../tests/framework/types';
import { AnvilManager } from '../../../tests/seeder/anvil-manager';

describe(SmokeAssets('Import custom token'), () => {
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
