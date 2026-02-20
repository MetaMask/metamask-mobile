'use strict';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { LocalNode, LocalNodeType } from '../../framework/types';
import { loginToApp } from '../../flows/wallet.flow';
import WalletView from '../../page-objects/wallet/WalletView';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { RegressionTrade } from '../../tags';
import Assertions from '../../framework/Assertions';
import {
  submitSwapUnifiedUI,
  checkSwapActivity,
} from '../../helpers/swap/swap-unified-ui';
import { testSpecificMock } from '../../helpers/swap/swap-mocks';
import { prepareSwapsTestEnvironment } from '../../helpers/swap/prepareSwapsTestEnvironment';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils';
import { AnvilManager } from '../../seeder/anvil-manager';

describe(RegressionTrade('Swap RWA'), (): void => {
  jest.setTimeout(120000);

  it('completes a USDC -> GOOGLON swap', async (): Promise<void> => {
    const quantity: string = '1000';
    const sourceTokenSymbol: string = 'USDC';
    const destTokenSymbol: string = 'GOOGLON';
    const chainId = '0x1';

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
                chainId,
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
              loadState: './tests/smoke/swap/withTokens.json',
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

        // Submit the Swap: USDC->GOOGLEon
        await submitSwapUnifiedUI(
          quantity,
          sourceTokenSymbol,
          destTokenSymbol,
          chainId,
        );

        // After the swap is complete, the GoogleON balance shouldn't be 0
        await Assertions.expectTextNotDisplayed('0 ' + destTokenSymbol, {
          timeout: 60000,
        });

        // Check the swap activity completed
        await checkSwapActivity(sourceTokenSymbol, destTokenSymbol);
      },
    );
  });
});
