import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { LocalNodeType } from '../../framework/types.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import { SmokeSwap } from '../../tags.js';
import {
  submitSwapUnifiedUI,
  checkSwapActivity,
} from '../../helpers/swap/swap-unified-ui.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import { prepareSwapsTestEnvironment } from '../../helpers/swap/prepareSwapsTestEnvironment.js';
import { testSpecificMock } from '../../helpers/swap/swap-mocks.js';
import { setupSmartTransactionsMocks } from '../../helpers/swap/smart-transactions-mocks.js';
import { DEFAULT_ANVIL_PORT } from '../../seeder/anvil-manager.js';
import { swapActionExpectations } from '../../helpers/analytics/expectations/swap-action.analytics.js';

appiumTest.describe(SmokeSwap('Swap from Actions'), () => {
  appiumTest.describe.configure({ timeout: 180000 });

  appiumTest(
    'swaps ETH->USDC with custom slippage and USDC->ETH',
    async ({ driver: _driver, currentDeviceDetails }) => {
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
                loadState: './tests/smoke-appium/swap/withTokens.json',
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
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await prepareSwapsTestEnvironment();
          await WalletView.tapWalletSwapButton();

          // Submit first swap: ETH->ERC20 (USDC) with custom slippage
          await submitSwapUnifiedUI('1', 'ETH', 'USDC', '0x1', {
            // slippage: '3.5',
            // comment out until bug #29615 is fixed
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
    },
  );
});
