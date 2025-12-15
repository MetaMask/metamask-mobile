import { test } from '../../../../fixtures/performance-test.js';

import TimerHelper from '../../../../utils/TimersHelper.js';
import LoginScreen from '../../../../../wdio/screen-objects/LoginScreen.js';
import WalletMainScreen from '../../../../../wdio/screen-objects/WalletMainScreen.js';
import TabBarModal from '../../../../../wdio/screen-objects/Modals/TabBarModal.js';
import WalletActionModal from '../../../../../wdio/screen-objects/Modals/WalletActionModal.js';
import PredictMarketListScreen from '../../../../../wdio/screen-objects/PredictMarketListScreen.js';
import { login } from '../../../../utils/Flows.js';

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
 * 1. Time to navigate to Predict tab
 * 2. Time for balance card to be displayed
 * 3. Time for available balance text to appear (balance fully loaded)
 */
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

  // Timer 1: Navigate to Predict tab and wait for container
  const timer1 = new TimerHelper(
    'Time since user taps Predict button until Predict Market List container is displayed',
  );
  timer1.start();
  await WalletActionModal.tapPredictButton();
  await PredictMarketListScreen.isContainerDisplayed();
  timer1.stop();

  // Timer 2: Wait for balance card to be displayed
  const timer2 = new TimerHelper(
    'Time since container is displayed until Balance Card is visible',
  );
  timer2.start();
  await PredictMarketListScreen.isBalanceCardDisplayed();
  timer2.stop();

  // Timer 3: Wait for available balance text to appear (indicates balance is fully loaded)
  const timer3 = new TimerHelper(
    'Time since balance card is visible until Available Balance text is displayed',
  );
  timer3.start();
  await PredictMarketListScreen.isAvailableBalanceDisplayed();
  timer3.stop();

  // Add all timers to performance tracker
  await performanceTracker.addTimer(timer1);
  await performanceTracker.addTimer(timer2);
  await performanceTracker.addTimer(timer3);

  // Attach performance metrics to test report
  await performanceTracker.attachToTest(testInfo);

  console.log('✅ Predict Available Balance Performance Test completed');
  console.log(`📊 Navigate to Predict: ${timer1.getDuration()}ms`);
  console.log(`📊 Balance Card Visible: ${timer2.getDuration()}ms`);
  console.log(`📊 Available Balance Loaded: ${timer3.getDuration()}ms`);

  const totalTime =
    timer1.getDuration() + timer2.getDuration() + timer3.getDuration();
  console.log(`📊 Total Time: ${totalTime}ms`);
});
