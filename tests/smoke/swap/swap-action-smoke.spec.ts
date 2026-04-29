import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { LocalNodeType } from '../../framework/types';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import WalletView from '../../page-objects/wallet/WalletView';
import { SmokeTrade } from '../../tags';
import {
  submitSwapUnifiedUI,
  checkSwapActivity,
} from '../../helpers/swap/swap-unified-ui';
import { loginToApp } from '../../flows/wallet.flow';
import { prepareSwapsTestEnvironment } from '../../helpers/swap/prepareSwapsTestEnvironment';
import { testSpecificMock } from '../../helpers/swap/swap-mocks';
import { setupSmartTransactionsMocks } from '../../helpers/swap/smart-transactions-mocks';
import { DEFAULT_ANVIL_PORT } from '../../seeder/anvil-manager';
import { swapActionExpectations } from '../../helpers/analytics/expectations/swap-action.analytics';

describe(SmokeTrade('Swap from Actions'), (): void => {
  beforeEach(async (): Promise<void> => {
    jest.setTimeout(180000);
  });

  it('swaps ETH->USDC with custom slippage and USDC->ETH', async (): Promise<void> => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withNetworkController({
            chainId: '0x1',
            rpcUrl: `http://localhost:${DEFAULT_ANVIL_PORT}`,
            type: 'custom',
            nickname: 'Localhost',
            ticker: 'ETH',
          })
          .withMetaMetricsOptIn()
          .build(),
        localNodeOptions: [
          {
            type: LocalNodeType.anvil,
            options: {
              chainId: 1,
              // Load pre-built state with USDC and DAI contracts + balances
              // This avoids needing a mainnet fork while still having readable token balances
              loadState: './tests/smoke/swap/withTokens.json',
            },
          },
        ],
        testSpecificMock: async (mockServer) => {
          await testSpecificMock(mockServer);
          await setupSmartTransactionsMocks(mockServer, DEFAULT_ANVIL_PORT);
        },
        restartDevice: true,
        skipReactNativeReload: true,
        analyticsExpectations: swapActionExpectations,
      },
      async () => {
        await loginToApp();
        await prepareSwapsTestEnvironment();
        await WalletView.tapWalletSwapButton();

        // Submit first swap: ETH->ERC20 (USDC) with custom slippage
        await submitSwapUnifiedUI('1', 'ETH', 'USDC', '0x1', {
          slippage: '3.5',
        });
        await checkSwapActivity('ETH', 'USDC');

        await TabBarComponent.tapWallet();
        await WalletView.tapWalletSwapButton();

        // Submit second swap: ERC20->ETH
        // Uses pre-funded USDC balance from loadState
        await submitSwapUnifiedUI('100', 'USDC', 'ETH', '0x1');
        await checkSwapActivity('USDC', 'ETH');
      },
    );
  });
});
