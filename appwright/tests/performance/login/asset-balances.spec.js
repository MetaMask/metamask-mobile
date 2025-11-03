import { test } from '../../../fixtures/performance-test.js';

import TimerHelper from '../../../utils/TimersHelper.js';
import WalletMainScreen from '../../../../wdio/screen-objects/WalletMainScreen.js';
import TabBarModal from '../../../../wdio/screen-objects/Modals/TabBarModal.js';
import LoginScreen from '../../../../wdio/screen-objects/LoginScreen.js';
import { login } from '../../../utils/Flows.js';
import AppwrightSelectors from '../../../../e2e/framework/AppwrightSelectors.js';
import { expect as appwrightExpect } from 'appwright';

/* Scenario: AccountGroupBalance Component Load Time - Measure time to load balance display */
test('Asset Balances - AccountGroupBalance Component Load Time (NFT to Tokens)', async ({
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

  // Create timer to measure AccountGroupBalance component load time
  const accountGroupBalanceTimer = new TimerHelper(
    'Time from clicking Tokens tab (from NFT) until AccountGroupBalance displays actual balance (not skeleton)',
  );

  // Start timer and click on Tokens tab
  console.log('Clicking on Tokens tab to measure AccountGroupBalance load...');
  accountGroupBalanceTimer.start();
  await WalletMainScreen.tapTokensTab();

  // Wait for the AccountGroupBalance component to display actual balance data
  // The component shows a skeleton initially, then loads the actual balance
  const totalBalanceText = await AppwrightSelectors.getElementByID(
    device,
    'total-balance-text',
  );

  // Wait for the balance text to be visible (not skeleton)
  await appwrightExpect(totalBalanceText).toBeVisible({ timeout: 30000 });

  // Stop timer once AccountGroupBalance has loaded actual balance data
  accountGroupBalanceTimer.stop();

  console.log(
    `AccountGroupBalance component loaded in: ${accountGroupBalanceTimer.getDuration()}ms`,
  );

  // Add timer to performance tracker
  performanceTracker.addTimer(accountGroupBalanceTimer);

  // Attach performance metrics to test
  await performanceTracker.attachToTest(testInfo);
});
