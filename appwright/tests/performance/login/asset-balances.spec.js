import { test } from '../../../fixtures/performance-test.js';

import TimerHelper from '../../../utils/TimersHelper.js';
import WalletMainScreen from '../../../../wdio/screen-objects/WalletMainScreen.js';
import TabBarModal from '../../../../wdio/screen-objects/Modals/TabBarModal.js';
import LoginScreen from '../../../../wdio/screen-objects/LoginScreen.js';
import { login } from '../../../utils/Flows.js';

/**
 * Scenario: Aggregated Balance Loading Time
 *
 * This test measures the time it takes for the aggregated balance to load and stabilize
 * on the wallet home screen. As tokens are progressively loaded, the balance updates:
 * Example: $0.00 → $2.15 → $30.25 → stable
 *
 * Method: Poll the balance text directly from the UI until it stops changing
 * Measured: Multiple timing metrics:
 *   1. Total time: navigation to wallet tab → final stable balance
 *   2. Render time: first UI render → final stable balance
 *   3. Time to first non-zero balance
 *
 * Stability: Balance is considered stable after showing the same value for 3 consecutive checks (100ms apart)
 */
test('Asset Balances - Aggregated Balance Loading Time', async ({
  device,
  performanceTracker,
}, testInfo) => {
  // Set device for screen objects
  WalletMainScreen.device = device;
  TabBarModal.device = device;
  LoginScreen.device = device;

  // Login to the wallet - this triggers balance loading
  await login(device);

  // Create timer that will track the entire balance loading process
  const balanceLoadingTimer = new TimerHelper(
    'Aggregated balance loading time (navigation to stable value)',
  );

  // Navigate to wallet tab and START TIMING
  balanceLoadingTimer.start();
  const navigationStartTime = Date.now();
  await TabBarModal.tapWalletButton();

  // Get the balance container element
  const balanceContainer = await WalletMainScreen.balanceContainer;

  // Helper function to get the current balance text
  const getBalanceText = async () => {
    try {
      const text = await balanceContainer.getText();
      return text || '$0.00';
    } catch {
      return '$0.00';
    }
  };

  const balanceHistory = [];
  let stableCount = 0;
  let previousBalance = '';
  const maxWaitTime = 30000; // 30 seconds max
  const pollInterval = 100; // Check every 100ms for better granularity

  // Wait for balance container to be visible (Playwright auto-waits on getText)
  // Just mark when we start polling as the first render time
  const firstRenderTime = Date.now();

  // Poll until balance stabilizes (same value for 3 consecutive checks)
  while (stableCount < 3) {
    if (Date.now() - navigationStartTime > maxWaitTime) {
      throw new Error('Timeout waiting for balance to stabilize');
    }

    const currentBalance = await getBalanceText();
    const now = Date.now();
    const elapsedSinceNavigation = now - navigationStartTime;
    const elapsedSinceFirstRender = now - firstRenderTime;

    // Track all balance values we see
    if (currentBalance !== previousBalance) {
      balanceHistory.push({
        balance: currentBalance,
        timestamp: now,
        elapsedSinceNavigation,
        elapsedSinceFirstRender,
      });
      stableCount = 0; // Reset stability counter
    } else {
      stableCount++;
    }

    previousBalance = currentBalance;
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  // STOP TIMING when balance stabilizes
  balanceLoadingTimer.stop();

  // Calculate different timing metrics
  const firstUpdate = balanceHistory[0];
  const lastUpdate = balanceHistory[balanceHistory.length - 1];

  // Time from navigation to final stable value
  const totalLoadingDuration = lastUpdate.elapsedSinceNavigation;

  // Time from first render to final stable value
  const renderToStableDuration = lastUpdate.elapsedSinceFirstRender;

  // Find first non-zero balance update
  const firstNonZeroUpdate = balanceHistory.find(
    (entry) => entry.balance !== '$0.00' && entry.balance !== '',
  );
  const timeToFirstNonZero = firstNonZeroUpdate
    ? firstNonZeroUpdate.elapsedSinceNavigation
    : 0;

  // Add timer to performance tracker
  performanceTracker.addTimer(balanceLoadingTimer);

  // Attach balance history as custom metrics
  testInfo.annotations.push({
    type: 'balance-progression',
    description: JSON.stringify({
      updates: balanceHistory,
      timeToFirstNonZero,
      totalLoadingDuration,
      renderToStableDuration,
    }),
  });

  // Attach performance metrics to test
  await performanceTracker.attachToTest(testInfo);
});
