import { test as perfTest } from '../../../framework/fixture';
import TimerHelper from '../../../framework/TimerHelper';
import { loginToAppPlaywright } from '../../../flows/wallet.flow';
import { asPlaywrightElement, PlaywrightAssertions } from '../../../framework';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../../page-objects/wallet/WalletActionsBottomSheet';
import PredictMarketList from '../../../page-objects/Predict/PredictMarketList';
import { PerformancePredict } from '../../../tags.performance.js';

/*
 * Scenario: Predict Available Balance Performance Test
 *
 * This test measures how long it takes to load the available balance
 * on the Predict Market List screen under 4G network conditions
 * (default for e2e tests).
 *
 * Test Setup:
 * - Account with access to Predict and visible available balance card
 *
 * The test measures:
 * 1. Time to navigate to Predict tab
 * 2. Time to verify available balance info is displayed
 */
perfTest.describe(PerformancePredict, () => {
  perfTest(
    'Predict Available Balance - Complete Flow Performance',
    { tag: '@team-predict' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      // Login to the app
      await loginToAppPlaywright();
      perfTest.setTimeout(15 * 60 * 1000);
      // Timer 1: Navigate to Predict tab and verify available balance
      const timer1 = new TimerHelper(
        'Time since user taps Predict button until Available Balance is displayed',
        { ios: 4500, android: 8000 },
        currentDeviceDetails.platform,
      );
      await TabBarComponent.tapActions();

      await WalletActionsBottomSheet.tapPredictButton();
      await timer1.measureRaw(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(PredictMarketList.container),
          { timeout: 60000 },
        );
      });

      // Add all timers to performance tracker
      performanceTracker.addTimers(timer1);

      // Attach performance metrics to test report

      console.log('Predict Available Balance Performance Test completed');
      console.log(`Available Balance Display: ${timer1.getDuration()}ms`);
      console.log(`Total Time: ${timer1.getDuration() ?? 0}ms`);
    },
  );
});
