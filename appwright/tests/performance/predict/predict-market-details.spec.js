import { test } from '../../../fixtures/performance-test.js';

import TimerHelper from '../../../utils/TimersHelper.js';
import LoginScreen from '../../../../wdio/screen-objects/LoginScreen.js';
import WalletMainScreen from '../../../../wdio/screen-objects/WalletMainScreen.js';
import TabBarModal from '../../../../wdio/screen-objects/Modals/TabBarModal.js';
import WalletActionModal from '../../../../wdio/screen-objects/Modals/WalletActionModal.js';
import PredictMarketListScreen from '../../../../wdio/screen-objects/PredictMarketListScreen.js';
import PredictDetailsScreen from '../../../../wdio/screen-objects/PredictDetailsScreen.js';
import { login } from '../../../utils/Flows.js';

/*
 * Scenario: Predict Market Details Performance Test
 *
 * This test measures how long it takes to load the market details page
 * under 4G network conditions (default for e2e tests).
 *
 * The test measures:
 * 1. Time to open predictions tab from wallet
 * 2. Time to load market list
 * 3. Time to open market details
 * 4. Time to load and verify About tab content
 * 5. Time to load and verify Outcomes tab content
 */
test('Predict Market Details - Load Time Performance', async ({
  device,
  performanceTracker,
}, testInfo) => {
  // Setup screen objects with device
  LoginScreen.device = device;
  WalletMainScreen.device = device;
  TabBarModal.device = device;
  WalletActionModal.device = device;
  PredictMarketListScreen.device = device;
  PredictDetailsScreen.device = device;

  // Login to the app
  await login(device);

  // Timer 1: Navigate to predictions tab
  const timer1 = new TimerHelper(
    'Time since user taps Actions button until Wallet Action Modal is visible',
  );
  timer1.start();
  await TabBarModal.tapActionButton();
  timer1.stop();

  // Timer 2: Open predictions tab
  const timer2 = new TimerHelper(
    'Time since user taps Predict button until Predict Market List is displayed',
  );
  timer2.start();
  await WalletActionModal.tapPredictButton();
  await PredictMarketListScreen.isContainerDisplayed();
  timer2.stop();

  // Timer 3: Open market details
  const timer3 = new TimerHelper(
    'Time since user taps market card until Market Details screen is visible',
  );
  timer3.start();
  await PredictMarketListScreen.tapMarketCard('trending', 1);
  await PredictDetailsScreen.isVisible();
  timer3.stop();

  // Timer 4: Load About tab
  const timer4 = new TimerHelper(
    'Time since user taps About tab until About tab content is loaded and Volume text is visible',
  );
  timer4.start();
  await PredictDetailsScreen.tapAboutTab();
  await PredictDetailsScreen.isAboutTabContentDisplayed();
  await PredictDetailsScreen.verifyVolumeTextDisplayed();
  timer4.stop();

  // Timer 5: Load Outcomes tab
  const timer5 = new TimerHelper(
    'Time since user taps Outcomes tab until Outcomes tab content is loaded and Yes/No options are visible',
  );
  timer5.start();
  await PredictDetailsScreen.tapOutcomesTab();
  await PredictDetailsScreen.isOutcomesTabContentDisplayed();
  await PredictDetailsScreen.verifyYesNoOutcomesDisplayed();
  timer5.stop();

  // Add all timers to performance tracker
  performanceTracker.addTimer(timer1);
  performanceTracker.addTimer(timer2);
  performanceTracker.addTimer(timer3);
  performanceTracker.addTimer(timer4);
  performanceTracker.addTimer(timer5);

  // Attach performance metrics to test report
  await performanceTracker.attachToTest(testInfo);

  console.log('✅ Predict Market Details Performance Test completed');
  console.log(`📊 Actions to Modal: ${timer1.duration}ms`);
  console.log(`📊 Modal to Market List: ${timer2.duration}ms`);
  console.log(`📊 Market List to Details: ${timer3.duration}ms`);
  console.log(`📊 About Tab Load: ${timer4.duration}ms`);
  console.log(`📊 Outcomes Tab Load: ${timer5.duration}ms`);
  console.log(
    `📊 Total Time: ${timer1.duration + timer2.duration + timer3.duration + timer4.duration + timer5.duration}ms`,
  );
});
