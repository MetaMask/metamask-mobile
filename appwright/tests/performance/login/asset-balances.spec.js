import { test } from '../../../fixtures/performance-test.js';

import TimerHelper from '../../../utils/TimersHelper.js';
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
 * Measured: Time from first non-zero balance to stable value (same for 3 consecutive checks)
 */
test('Asset Balances - Aggregated Balance Loading Time', async ({
  device,
  performanceTracker,
}, testInfo) => {
  // Set device for screen objects
  TabBarModal.device = device;
  LoginScreen.device = device;

  // Login to the wallet - this triggers balance loading
  await login(device);

  // Navigate to wallet tab
  await TabBarModal.tapWalletButton();

  // Get the balance container element
  const balanceContainer = await device.$('~balance-container');

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
  let startTimestamp = 0;
  const maxWaitTime = 30000; // 30 seconds max
  const startWaitTime = Date.now();
  const pollInterval = 300; // Check every 300ms

  // Poll until balance stabilizes (same value for 3 consecutive checks)
  while (stableCount < 3) {
    if (Date.now() - startWaitTime > maxWaitTime) {
      throw new Error('Timeout waiting for balance to stabilize');
    }

    const currentBalance = await getBalanceText();
    const now = Date.now();

    // Record first non-zero balance as start
    if (
      startTimestamp === 0 &&
      currentBalance !== '$0.00' &&
      currentBalance !== ''
    ) {
      startTimestamp = now;
      balanceHistory.push({
        balance: currentBalance,
        timestamp: now,
        elapsed: 0,
      });
    }

    // Track balance changes after start
    if (startTimestamp > 0 && currentBalance !== previousBalance) {
      const elapsed = now - startTimestamp;
      balanceHistory.push({
        balance: currentBalance,
        timestamp: now,
        elapsed,
      });
      stableCount = 0; // Reset stability counter
    } else if (startTimestamp > 0 && currentBalance === previousBalance) {
      stableCount++;
    }

    previousBalance = currentBalance;
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  // Calculate loading duration
  const lastUpdate = balanceHistory[balanceHistory.length - 1];
  const loadingDuration = lastUpdate.elapsed;

  // Create timer with the measured duration
  const balanceLoadingTimer = new TimerHelper(
    'Aggregated balance loading time (first update to stable value)',
  );
  balanceLoadingTimer.start();
  await new Promise((resolve) => setTimeout(resolve, 10));
  balanceLoadingTimer.stop();
  balanceLoadingTimer.duration = loadingDuration;

  // Add timer to performance tracker
  performanceTracker.addTimer(balanceLoadingTimer);

  // Attach performance metrics to test
  await performanceTracker.attachToTest(testInfo);
});
