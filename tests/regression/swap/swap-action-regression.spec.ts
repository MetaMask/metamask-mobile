import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { LocalNode, LocalNodeType } from '../../framework/types';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import WalletView from '../../page-objects/wallet/WalletView';
import { RegressionTrade } from '../../tags';
import {
  submitSwapUnifiedUI,
  checkSwapActivity,
} from '../../helpers/swap/swap-unified-ui';
import { loginToApp } from '../../flows/wallet.flow';
import { prepareSwapsTestEnvironment } from '../../helpers/swap/prepareSwapsTestEnvironment';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils';
import { testSpecificMock } from '../../helpers/swap/swap-mocks';
import { AnvilManager } from '../../seeder/anvil-manager';

describe(RegressionTrade('Swap ETH <-> WETH from Actions'), (): void => {
  beforeEach(async (): Promise<void> => {
    jest.setTimeout(180000);
  });

  it('swaps ETH->WETH and WETH->ETH', async (): Promise<void> => {
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
                chainId: '0x1',
                rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
                type: 'custom',
                nickname: 'Localhost',
                ticker: 'ETH',
              },
            })
            .withDisabledSmartTransactions()
            .build();
        },
        localNodeOptions: [
          {
            type: LocalNodeType.anvil,
            options: {
              chainId: 1,
              loadState: './tests/regression/swap/withTokensWeth.json',
            },
          },
        ],
        testSpecificMock,
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await prepareSwapsTestEnvironment();
        await WalletView.tapWalletSwapButton();

        // Submit first swap: ETH -> WETH
        await submitSwapUnifiedUI('1', 'ETH', 'WETH', '0x1');
        await checkSwapActivity('ETH', 'WETH');

        await TabBarComponent.tapWallet();
        await WalletView.tapWalletSwapButton();

        // Submit second swap: WETH -> ETH
        await submitSwapUnifiedUI('1', 'WETH', 'ETH', '0x1');
        await checkSwapActivity('WETH', 'ETH');
      },
    );
  });
});
