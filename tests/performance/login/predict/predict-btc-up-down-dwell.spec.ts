import { test as perfTest } from '../../../framework/fixtures/playwright';
import TimerHelper from '../../../framework/TimerHelper';
import { loginToAppPlaywright } from '../../../flows/wallet.flow';
import { asPlaywrightElement, PlaywrightAssertions } from '../../../framework';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent';
import ToastModal from '../../../page-objects/wallet/ToastModal';
import WalletActionsBottomSheet from '../../../page-objects/wallet/WalletActionsBottomSheet';
import PredictMarketList from '../../../page-objects/Predict/PredictMarketList';
import PredictCryptoUpDownDetailsPage from '../../../page-objects/Predict/PredictCryptoUpDownDetailsPage';
import { Performance, PerformancePredict } from '../../../tags.performance.js';

const BTC_UP_OR_DOWN_SEARCH_QUERY = 'Bitcoin Up or Down';
const BTC_UP_OR_DOWN_TITLE = /Bitcoin Up or Down/;

/*
 * Scenario: Predict BTC Up or Down dwell (BrowserStack app profiling PoC)
 *
 * Login with the SRP-preloaded build, open Predict, search for a Bitcoin Up or
 * Down market, open it, and remain on that screen for 5 minutes so BrowserStack
 * app profiling can capture a sustained session.
 */
perfTest.describe(`${Performance} ${PerformancePredict}`, () => {
  perfTest(
    'Predict BTC Up or Down - 5 minute dwell for profiling',
    { tag: '@team-predict' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      // Login to the app
      await loginToAppPlaywright();
      perfTest.setTimeout(15 * 60 * 1000);

      // Timer 1: Navigate to Predict tab
      const timer1 = new TimerHelper(
        'Time since user taps Predict button until Predict Market List is displayed',
        { ios: 8000, android: 5000 },
        currentDeviceDetails.platform,
      );
      await ToastModal.waitForToastToDismiss();

      await TabBarComponent.tapActions();

      await WalletActionsBottomSheet.tapPredictButton();
      await timer1.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(PredictMarketList.container),
          { timeout: 60000 },
        );
      });

      // Timer 2: Search and open Bitcoin Up or Down market details
      const timer2 = new TimerHelper(
        'Time since user searches Bitcoin Up or Down until details are visible',
        { ios: 5000, android: 8000 },
        currentDeviceDetails.platform,
      );

      await PredictMarketList.tapSearchButton();
      await PredictMarketList.typeSearchQuery(BTC_UP_OR_DOWN_SEARCH_QUERY);
      await PredictMarketList.tapMarketByTitle(BTC_UP_OR_DOWN_TITLE);
      await timer2.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(PredictCryptoUpDownDetailsPage.container),
        );
      });

      // Stay on the market details screen for 5 minutes (profiling window)
      const dwellMs = 5 * 60 * 1000;
      const pollMs = 30 * 1000;
      const dwellDeadline = Date.now() + dwellMs;
      while (Date.now() < dwellDeadline) {
        await driver.getWindowSize();
        const remainingMs = dwellDeadline - Date.now();
        if (remainingMs <= 0) {
          break;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(pollMs, remainingMs)),
        );
      }

      // Add all timers to performance tracker
      performanceTracker.addTimers(timer1, timer2);

      // Attach performance metrics to test report

      console.log('Predict BTC Up or Down dwell profiling PoC completed');
      console.log(`Navigate to Predict: ${timer1.getDuration()}ms`);
      console.log(`Open Market Details: ${timer2.getDuration()}ms`);
      console.log(
        `Total Time: ${(timer1.getDuration() ?? 0) + (timer2.getDuration() ?? 0)}ms`,
      );
    },
  );
});
