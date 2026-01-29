import { test } from '../../../../fixtures/performance-test.js';

import TimerHelper from '../../../../utils/TimersHelper.js';
import LoginScreen from '../../../../../wdio/screen-objects/LoginScreen.js';
import WalletMainScreen from '../../../../../wdio/screen-objects/WalletMainScreen.js';
import TabBarModal from '../../../../../wdio/screen-objects/Modals/TabBarModal.js';
import WalletActionModal from '../../../../../wdio/screen-objects/Modals/WalletActionModal.js';
import PredictMarketListScreen from '../../../../../wdio/screen-objects/PredictMarketListScreen.js';
import { login } from '../../../../utils/Flows.js';
import { PerformancePredict } from '../../../../tags.js';

/*
 * Scenario: Predict Available Balance Performance Test
 *
 * This test measures how long it takes to load the available balance
 * on the Predict Market List screen under 4G network conditions.
 *
 * Test Setup:
 * - Account with existing balance on Polygon
 *
 * The test measures:
 * 1. Total time from tapping Predict button until available balance is displayed
 */
test.describe(PerformancePredict, () => {
  test('Predict Available Balance - Load Time Performance', async ({
    device,
    performanceTracker,
  }, testInfo) => {
    // Setup screen objects with device
    LoginScreen.device = device;
    WalletMainScreen.device = device;
    TabBarModal.device = device;
    WalletActionModal.device = device;
    PredictMarketListScreen.device = device;

    // Login to the app
    await login(device);
    await TabBarModal.tapActionButton();
    await WalletActionModal.tapPredictButton();

    // Timer 1: Navigate to Predict tab and wait for available balance to load
    const timer1 = new TimerHelper(
      'Time since user taps Predict button in Action modal until Available Balance is displayed',
      { ios: 4500, android: 8000 },
      device,
    );
    timer1.start();
    await PredictMarketListScreen.isBalanceCardDisplayed();
    await PredictMarketListScreen.isAvailableBalanceDisplayed();
    timer1.stop();

    // Add timer to performance tracker
    await performanceTracker.addTimer(timer1);

    // Attach performance metrics to test report
    await performanceTracker.attachToTest(testInfo);

    console.log('✅ Predict Available Balance Performance Test completed');
    console.log(
      `📊 Total Time to Available Balance: ${timer1.getDuration()}ms`,
    );
  });
}); // End describe
