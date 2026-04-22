import { test as perfTest } from '../../../framework/fixture';
import TimerHelper from '../../../framework/TimerHelper';
import { loginToAppPlaywright } from '../../../flows/wallet.flow';
import { asPlaywrightElement, PlaywrightAssertions } from '../../../framework';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../../page-objects/wallet/WalletActionsBottomSheet';
import PredictMarketList from '../../../page-objects/Predict/PredictMarketList';
import PredictDetailsPage from '../../../page-objects/Predict/PredictDetailsPage';
import { PerformancePredict } from '../../../tags.performance.js';

/*
 * Scenario: Predict Market Details Performance Test
 *
 * This test measures how long it takes to complete the market details flow
 * under 4G network conditions (default for e2e tests).
 *
 * Test Setup:
 * - Account with access to Predict markets and at least one market card
 *
 * The test measures:
 * 1. Time to navigate to Predict tab
 * 2. Time to open market details
 * 3. Time to open About tab content
 * 4. Time to open Outcomes tab content when available
 */
perfTest.describe(PerformancePredict, () => {
  perfTest.setTimeout(10 * 60 * 1000);

  perfTest(
    'Predict Market Details - Complete Flow Performance',
    { tag: '@team-predict' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      // Login to the app
      await loginToAppPlaywright();

      // Timer 1: Navigate to Predict tab
      const timer1 = new TimerHelper(
        'Time since user taps Predict button until Predict Market List is displayed',
        { ios: 8000, android: 8000 },
        currentDeviceDetails.platform,
      );

      await TabBarComponent.tapActions();
      await WalletActionsBottomSheet.tapPredictButton();
      await timer1.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(PredictMarketList.container),
        );
      });

      // Timer 2: Open market details
      const timer2 = new TimerHelper(
        'Time since user taps market card until Market Detail screen is visible',
        { ios: 1500, android: 1500 },
        currentDeviceDetails.platform,
      );

      await PredictMarketList.tapMarketCard('trending', 1);
      await timer2.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(PredictDetailsPage.container),
        );
      });

      // Timer 3: Open About tab
      const timer3 = new TimerHelper(
        'Time since user taps About tab until About tab is visible',
        { ios: 750, android: 1000 },
        currentDeviceDetails.platform,
      );

      await PredictDetailsPage.tapAboutTab();
      await timer3.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(PredictDetailsPage.aboutTabContent),
        );
      });

      const timersToAdd = [timer1, timer2, timer3];
      let timer4: TimerHelper | undefined;

      const hasOutcomesTab = await (
        await asPlaywrightElement(PredictDetailsPage.outcomesTab)
      ).isVisible();

      if (hasOutcomesTab) {
        // Timer 4: Open Outcomes tab
        timer4 = new TimerHelper(
          'Time since user taps Outcomes tab until Outcomes tab is visible',
          { ios: 750, android: 1000 },
          currentDeviceDetails.platform,
        );

        await PredictDetailsPage.tapOutcomesTab();

        await timer4.measure(async () => {
          await PlaywrightAssertions.expectElementToBeVisible(
            asPlaywrightElement(PredictDetailsPage.outcomesTabContent),
          );
        });

        timersToAdd.push(timer4);
      }

      // Add all timers to performance tracker
      performanceTracker.addTimers(...timersToAdd);

      // Attach performance metrics to test report

      console.log('Predict Market Details Performance Test completed');
      console.log(`Navigate to Predict: ${timer1.getDuration()}ms`);
      console.log(`Open Market Details: ${timer2.getDuration()}ms`);
      console.log(`Open About Tab: ${timer3.getDuration()}ms`);
      if (timer4) {
        console.log(`Open Outcomes Tab: ${timer4.getDuration()}ms`);
      }
      console.log(
        `Total Time: ${
          (timer1.getDuration() ?? 0) +
          (timer2.getDuration() ?? 0) +
          (timer3.getDuration() ?? 0) +
          (timer4?.getDuration() ?? 0)
        }ms`,
      );
    },
  );
});
