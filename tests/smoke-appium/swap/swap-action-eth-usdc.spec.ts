import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import Assertions from '../../framework/Assertions.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import ActivitiesView from '../../page-objects/Transactions/ActivitiesView.js';
import { SmokeSwap } from '../../tags.js';
import {
  submitSwapUnifiedUI,
  checkSwapActivity,
} from '../../helpers/swap/swap-unified-ui.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import { swapActionExpectations } from '../../helpers/analytics/expectations/swap-action.analytics.js';
import {
  buildSwapFixture,
  ANVIL_WITH_TOKENS_OPTIONS,
  swapTestSpecificMock,
} from '../../helpers/swap/swap-action-smoke.helpers.js';

appiumTest.describe(SmokeSwap('Swap from Actions - ETH to USDC'), () => {
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
