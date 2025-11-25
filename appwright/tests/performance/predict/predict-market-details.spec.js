import { test } from '../../../fixtures/performance-test.js';
import { type WebdriverIO5Device } from '../../../wdio/type-helpers.js';

import TimerHelper from '../../../utils/TimersHelper.js';
import LoginScreen from '../../../../wdio/screen-objects/LoginScreen.js';
import WalletMainScreen from '../../../../wdio/screen-objects/WalletMainScreen.js';
import TabBarModal from '../../../../wdio/screen-objects/Modals/TabBarModal.js';
import WalletActionModal from '../../../../wdio/screen-objects/Modals/WalletActionModal.js';
import PredictMarketListScreen from '../../../../wdio/screen-objects/PredictMarketListScreen.js';
import PredictDetailsScreen from '../../../../wdio/screen-objects/PredictDetailsScreen.js';
import { login } from '../../../utils/Flows.js';

/**
 * Helper function to inject the device object into all necessary screen objects.
 * This simplifies the test setup and improves readability (Optimization #1).
 */
function setupScreenObjects(device: WebdriverIO5Device): void {
  LoginScreen.device = device;
  WalletMainScreen.device = device;
  TabBarModal.device = device;
  WalletActionModal.device = device;
  PredictMarketListScreen.device = device;
  PredictDetailsScreen.device = device;
}

/*
 * Scenario: Predict Market Details Performance Test
 *
 * This test measures the load time for key screens and tabs within the
 * Prediction Market flow under 4G network conditions.
 */
test('Predict Market Details - Load Time Performance', async ({
  device,
  performanceTracker,
}, testInfo) => {
  // OPTIMIZATION #1: Simplify screen object setup
  setupScreenObjects(device);

  // --- Initial Flow: Login and Open Action Modal ---
  await login(device);
  await TabBarModal.tapActionButton();

  // --- Timer 1: Open Predictions Tab & Market List Load ---
  // Measures the time from the button tap until the market list is confirmed displayed.
  const timer1 = new TimerHelper(
    '1. Modal to Market List Load Time',
  );
  timer1.start();
  await WalletActionModal.tapPredictButton();
  await PredictMarketListScreen.isContainerDisplayed();
  timer1.stop(); // Stop immediately after the container is displayed

  // --- Timer 2: Market List to Market Details Load ---
  // Measures the time from tapping a card until the details screen is visible.
  const timer2 = new TimerHelper(
    '2. Market List to Details Screen Load Time',
  );
  timer2.start();
  // Tapping the first trending market card
  await PredictMarketListScreen.tapMarketCard('trending', 1);
  await PredictDetailsScreen.isVisible();
  timer2.stop(); // Stop immediately once the screen is visible

  // --- Timer 3: Load About Tab ---
  const timer3 = new TimerHelper(
    '3. About Tab Content Load Time',
  );
  timer3.start();
  await PredictDetailsScreen.tapAboutTab();
  await PredictDetailsScreen.isAboutTabContentDisplayed();
  timer3.stop(); // Stop after content is confirmed loaded
  
  // OPTIMIZATION #2: Move verification out of the measured duration
  await PredictDetailsScreen.verifyVolumeTextDisplayed(); 
  
  // --- Timer 4: Load Outcomes Tab ---
  const timer4 = new TimerHelper(
    '4. Outcomes Tab Content Load Time',
  );
  timer4.start();
  await PredictDetailsScreen.tapOutcomesTab();
  await PredictDetailsScreen.isOutcomesTabContentDisplayed();
  timer4.stop(); // Stop after content is confirmed loaded

  // --- Final Reporting ---
  
  // The original Timer2/3/4/5 names are now Timer1/2/3/4 for conciseness
  await performanceTracker.addTimer(timer1); 
  await performanceTracker.addTimer(timer2);
  await performanceTracker.addTimer(timer3);
  await performanceTracker.addTimer(timer4);

  // Attach performance metrics to test report
  await performanceTracker.attachToTest(testInfo);

  // OPTIMIZATION #3: Simplified console output, let the tracker handle total time.
  console.log('✅ Predict Market Details Performance Test completed');
  console.log(`📊 1. Modal to Market List: ${timer1.getDuration()}ms`);
  console.log(`📊 2. Market List to Details: ${timer2.getDuration()}ms`);
  console.log(`📊 3. About Tab Load: ${timer3.getDuration()}ms`);
  console.log(`📊 4. Outcomes Tab Load: ${timer4.getDuration()}ms`);
});
