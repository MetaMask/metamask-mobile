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
import { testSpecificMock } from '../../helpers/swap/swap-mocks';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils';
import { AnvilManager } from '../../seeder/anvil-manager';

describe(RegressionTrade('Multiple Swaps from Actions'), (): void => {
  beforeEach(async (): Promise<void> => {
    jest.setTimeout(120000);
  });

  it('should complete a USDC to DAI swap from the token chart', async (): Promise<void> => {
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
            .withDisabledSmartTransactions()
            .build();
        },
        localNodeOptions: [
          {
            type: LocalNodeType.anvil,
            options: {
              chainId: 1,
              forkUrl: `https://mainnet.infura.io/v3/${process.env.MM_INFURA_PROJECT_ID}`,
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

        // Submit the Swap ETH->DAI
        await submitSwapUnifiedUI('1', 'ETH', 'DAI', '0x1');
        await checkSwapActivity('ETH', 'DAI');

        await TabBarComponent.tapWallet();
        await WalletView.tapWalletSwapButton();

        await submitSwapUnifiedUI('1000', 'DAI', 'ETH', '0x1');
        await checkSwapActivity('DAI', 'ETH');
      },
    );
  });
});
