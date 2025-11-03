import { test } from '../../../fixtures/performance-test.js';

import TimerHelper from '../../../utils/TimersHelper.js';
import WalletMainScreen from '../../../../wdio/screen-objects/WalletMainScreen.js';
import TabBarModal from '../../../../wdio/screen-objects/Modals/TabBarModal.js';
import LoginScreen from '../../../../wdio/screen-objects/LoginScreen.js';
import { login } from '../../../utils/Flows.js';
import { expect as appwrightExpect } from 'appwright';

/* Scenario: Token Balances Polling Cycle - Measure time for one complete TokenBalancesController polling cycle (excluding prices) */
test('Asset Balances - Token Balances Polling Cycle (NFT to Tokens)', async ({
  device,
  performanceTracker,
}, testInfo) => {
  // Set device for screen objects
  WalletMainScreen.device = device;
  TabBarModal.device = device;
  LoginScreen.device = device;

  // Login to the wallet
  await login(device);

  // Ensure we're on the wallet main screen
  await WalletMainScreen.isMainWalletViewVisible();

  // Navigate to wallet tab
  await TabBarModal.tapWalletButton();

  // Wait a moment for the initial load
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Click on NFT tab first to reset state
  console.log('Clicking on NFT tab...');
  await WalletMainScreen.tapNFTTab();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Create timer to measure one complete token balances polling cycle (without prices)
  const tokenBalancesPollingTimer = new TimerHelper(
    'Time from clicking Tokens tab (from NFT) until one complete token balances polling cycle finishes (excluding prices)',
  );

  // Start timer and click on Tokens tab
  console.log(
    'Clicking on Tokens tab to measure token balances polling cycle...',
  );
  tokenBalancesPollingTimer.start();
  await WalletMainScreen.tapTokensTab();

  // Wait for the token balances polling cycle to complete
  // The marker appears only when balance data CHANGES from initial state,
  // indicating a fresh polling cycle has completed (not just stale cached data)
  const tokenBalancesMarker = await WalletMainScreen.tokenBalancesLoadedMarker;

  // Wait for the marker to be visible
  await appwrightExpect(tokenBalancesMarker).toBeVisible({ timeout: 30000 });

  // Stop timer once one polling cycle has completed
  tokenBalancesPollingTimer.stop();

  console.log(
    `Token balances polling cycle completed in: ${tokenBalancesPollingTimer.getDuration()}ms (excluding prices)`,
  );

  // Add timer to performance tracker
  performanceTracker.addTimer(tokenBalancesPollingTimer);

  // Attach performance metrics to test
  await performanceTracker.attachToTest(testInfo);
});
