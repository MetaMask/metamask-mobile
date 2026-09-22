import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { LocalNodeType, type TestSpecificMock } from '../../framework/types.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import Assertions from '../../framework/Assertions.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import ActivitiesView from '../../page-objects/Transactions/ActivitiesView.js';
import { SmokeSwap } from '../../tags.js';
import {
  submitSwapUnifiedUI,
  checkSwapActivity,
} from '../../helpers/swap/swap-unified-ui.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import { testSpecificMock } from '../../helpers/swap/swap-mocks.js';
import { setupSmartTransactionsMocks } from '../../helpers/swap/smart-transactions-mocks.js';
import { DEFAULT_ANVIL_PORT } from '../../seeder/anvil-manager.js';
import { swapActionExpectations } from '../../helpers/analytics/expectations/swap-action.analytics.js';

/** Local Anvil "Mainnet" with MetaMetrics on, shared by both swap directions. */
const buildSwapFixture = () =>
  new FixtureBuilder()
    .withNetworkController({
      chainId: '0x1',
      rpcUrl: `http://localhost:${DEFAULT_ANVIL_PORT}`,
      type: 'custom',
      nickname: 'Localhost',
      ticker: 'ETH',
    })
    .withMetaMetricsOptIn()
    .build();

const ANVIL_WITH_TOKENS_OPTIONS = [
  {
    type: LocalNodeType.anvil,
    options: {
      chainId: 1,
      // Load pre-built state with USDC and DAI contracts + balances
      // This avoids needing a mainnet fork while still having readable token balances
      loadState: './tests/smoke-appium/swap/withTokens.json',
    },
  },
];

const swapTestSpecificMock: TestSpecificMock = async (mockServer) => {
  await testSpecificMock(mockServer);
  await setupSmartTransactionsMocks(mockServer, DEFAULT_ANVIL_PORT);
};

// Each direction gets its own fixture so a single swap — not two plus the
// navigation back out of Activity — has to fit the suite timeout on CI, where
// three emulators share one UiAutomator pipe.
appiumTest.describe(SmokeSwap('Swap from Actions'), () => {
  appiumTest.describe.configure({ timeout: 240_000 });

  appiumTest(
    'swaps ETH->USDC with custom slippage',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: buildSwapFixture,
          localNodeOptions: ANVIL_WITH_TOKENS_OPTIONS,
          testSpecificMock: swapTestSpecificMock,
          restartDevice: true,
          skipReactNativeReload: true,
          analyticsExpectations: swapActionExpectations,
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await WalletView.tapWalletSwapButton();

          await submitSwapUnifiedUI('1', 'ETH', 'USDC', '0x1', {
            slippage: '3.5',
          });
          await checkSwapActivity('ETH', 'USDC');
          // The row title flips from "Swapping" to "Swapped" once the swap tx
          // confirms; the Completed MetaMetrics event follows that confirmation.
          await Assertions.expectElementToBeVisible(
            ActivitiesView.swappedActivityTitle,
            {
              timeout: 60000,
              description: 'Activity row reports the swap as completed',
            },
          );
        },
      );
    },
  );

  appiumTest(
    'swaps USDC->ETH',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: buildSwapFixture,
          localNodeOptions: ANVIL_WITH_TOKENS_OPTIONS,
          testSpecificMock: swapTestSpecificMock,
          restartDevice: true,
          skipReactNativeReload: true,
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await WalletView.tapWalletSwapButton();

          // Uses pre-funded USDC balance from loadState
          await submitSwapUnifiedUI('100', 'USDC', 'ETH', '0x1');
          await checkSwapActivity('USDC', 'ETH');
          await Assertions.expectElementToBeVisible(
            ActivitiesView.swappedActivityTitle,
            {
              timeout: 60000,
              description: 'Activity row reports the swap as completed',
            },
          );
        },
      );
    },
  );
});
