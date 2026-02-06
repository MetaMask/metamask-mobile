import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { LocalNode, LocalNodeType } from '../../framework/types';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import TabBarComponent from '../../../e2e/pages/wallet/TabBarComponent';
import WalletView from '../../../e2e/pages/wallet/WalletView';
import { RegressionTrade } from '../../../e2e/tags';
import {
  submitSwapUnifiedUI,
  checkSwapActivity,
} from '../../helpers/swap/swap-unified-ui';
import { loginToApp } from '../../../e2e/viewHelper';
import { prepareSwapsTestEnvironment } from '../../helpers/swap/prepareSwapsTestEnvironment';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils';
import { testSpecificMock } from '../../helpers/swap/swap-mocks';
import { AnvilManager } from '../../seeder/anvil-manager';

describe(RegressionTrade('Swap ETH <-> WETH from Actions'), (): void => {
  beforeEach(async (): Promise<void> => {
    jest.setTimeout(180000);
  });

  it('should complete multiple ETH <-> WETH swaps from wallet actions', async (): Promise<void> => {
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
