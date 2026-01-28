import { test } from '../../../../fixtures/performance-test.js';

import TimerHelper from '../../../../utils/TimersHelper.js';
import LoginScreen from '../../../../../wdio/screen-objects/LoginScreen.js';
import WalletMainScreen from '../../../../../wdio/screen-objects/WalletMainScreen.js';
import TabBarModal from '../../../../../wdio/screen-objects/Modals/TabBarModal.js';
import WalletActionModal from '../../../../../wdio/screen-objects/Modals/WalletActionModal.js';
import PredictMarketListScreen from '../../../../../wdio/screen-objects/PredictMarketListScreen.js';
import PredictDetailsScreen from '../../../../../wdio/screen-objects/PredictDetailsScreen.js';
import { login } from '../../../../utils/Flows.js';
import { PerformancePredict } from '../../../../tags.js';

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
test.describe(PerformancePredict, () => {
  test(
    'Predict Market Details - Load Time Performance',
    { tag: '@team-predict' },
    async ({ device, performanceTracker }, testInfo) => {
      // Setup screen objects with device
      LoginScreen.device = device;
      WalletMainScreen.device = device;
      TabBarModal.device = device;
      WalletActionModal.device = device;
      PredictMarketListScreen.device = device;
      PredictDetailsScreen.device = device;

      // Login to the app
      await login(device);
      await TabBarModal.tapActionButton();

      // Timer 2: Open predictions tab (threshold: 5000ms + 10% = 5500ms)
      const timer2 = new TimerHelper(
        'Time since user taps Predict button until Predict Market List is displayed',
        { ios: 2800, android: 4000 },
        device,
      );
      await timer2.measure(async () => {
        await WalletActionModal.tapPredictButton();
        await PredictMarketListScreen.isContainerDisplayed();
      });

      // Timer 3: Open market details (threshold: 5000ms + 10% = 5500ms)
      const timer3 = new TimerHelper(
        'Time since user taps market card until Market Details screen is visible',
        { ios: 17000, android: 13000 },
        device,
      );
      await timer3.measure(async () => {
        await PredictMarketListScreen.tapMarketCard('trending', 1);
        await PredictDetailsScreen.isVisible();
      });

      // Timer 4: Load About tab (threshold: 3000ms + 10% = 3300ms)
      const timer4 = new TimerHelper(
        'Time since user taps About tab until About tab content is loaded and Volume text is visible',
        { ios: 7800, android: 7800 },
        device,
      );
      await timer4.measure(async () => {
        await PredictDetailsScreen.tapAboutTab();
        await PredictDetailsScreen.isAboutTabContentDisplayed();
        await PredictDetailsScreen.verifyVolumeTextDisplayed();
      });

      // Timer 5: Load Outcomes tab (threshold: 3000ms + 10% = 3300ms)
      const timer5 = new TimerHelper(
        'Time since user taps Outcomes tab until Outcomes tab content is loaded and Yes/No options are visible',
        { ios: 6000, android: 6000 },
        device,
      );
      await PredictDetailsScreen.tapOutcomesTab();
      await timer5.measure(async () => {
        await PredictDetailsScreen.isOutcomesTabContentDisplayed();
      });

      // Add all timers to performance tracker
      performanceTracker.addTimers(timer2, timer3, timer4, timer5);

      // Attach performance metrics to test report
      await performanceTracker.attachToTest(testInfo);

      console.log('✅ Predict Market Details Performance Test completed');
      console.log(`📊 Modal to Market List: ${timer2.getDuration()}ms`);
      console.log(`📊 Market List to Details: ${timer3.getDuration()}ms`);
      console.log(`📊 About Tab Load: ${timer4.getDuration()}ms`);
      console.log(`📊 Outcomes Tab Load: ${timer5.getDuration()}ms`);
      console.log(
        `📊 Total Time: ${timer2.getDuration() + timer3.getDuration() + timer4.getDuration() + timer5.getDuration()}ms`,
      );
    },
  );
});
