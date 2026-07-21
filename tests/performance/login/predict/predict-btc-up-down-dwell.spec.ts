import { test as perfTest } from '../../../framework/fixtures/playwright';
import TimerHelper from '../../../framework/TimerHelper';
import { loginToAppPlaywright } from '../../../flows/wallet.flow';
import {
  asPlaywrightElement,
  PlaywrightAssertions,
  sleep,
} from '../../../framework';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent';
import ToastModal from '../../../page-objects/wallet/ToastModal';
import WalletActionsBottomSheet from '../../../page-objects/wallet/WalletActionsBottomSheet';
import PredictMarketList from '../../../page-objects/Predict/PredictMarketList';
import PredictCryptoUpDownDetailsPage from '../../../page-objects/Predict/PredictCryptoUpDownDetailsPage';
import { Performance, PerformancePredict } from '../../../tags.performance.js';

const BTC_UP_OR_DOWN_TITLE = /BTC Up or Down/;
const DWELL_DURATION_MS = 5 * 60 * 1000;
const DWELL_KEEPALIVE_INTERVAL_MS = 30_000;

/*
 * Scenario: Predict BTC Up or Down dwell (BrowserStack app profiling PoC)
 *
 * Login with the SRP-preloaded build, open Predict, filter Crypto, open a
 * BTC Up or Down market, and remain on that screen for 5 minutes so
 * BrowserStack app profiling can capture a sustained session.
 */
perfTest.describe(`${Performance} ${PerformancePredict}`, () => {
  perfTest.setTimeout(15 * 60 * 1000);

  perfTest(
    'Predict BTC Up or Down - 5 minute dwell for profiling',
    { tag: '@team-predict' },
    async ({ currentDeviceDetails, driver, performanceTracker }) => {
      await loginToAppPlaywright();

      const navigateToPredictTimer = new TimerHelper(
        'Time since user taps Predict until Predict Market List is displayed',
        { ios: 8000, android: 5000 },
        currentDeviceDetails.platform,
      );

      await ToastModal.waitForToastToDismiss();
      await TabBarComponent.tapActions();
      await WalletActionsBottomSheet.tapPredictButton();
      await navigateToPredictTimer.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(PredictMarketList.container),
        );
      });

      await PredictMarketList.tapCategoryTab('crypto');

      const openMarketTimer = new TimerHelper(
        'Time since user taps BTC Up or Down until crypto up/down details are visible',
        { ios: 5000, android: 8000 },
        currentDeviceDetails.platform,
      );

      await PredictMarketList.tapMarketByTitle(BTC_UP_OR_DOWN_TITLE);
      await openMarketTimer.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(PredictCryptoUpDownDetailsPage.container),
        );
      });

      const dwellTimer = new TimerHelper(
        'Dwell on BTC Up or Down market details for BrowserStack app profiling',
      );
      dwellTimer.start();

      const dwellDeadline = Date.now() + DWELL_DURATION_MS;
      while (Date.now() < dwellDeadline) {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(PredictCryptoUpDownDetailsPage.container),
          { timeout: 10_000 },
        );

        const remainingMs = dwellDeadline - Date.now();
        if (remainingMs <= 0) {
          break;
        }
        await sleep(Math.min(DWELL_KEEPALIVE_INTERVAL_MS, remainingMs));
      }

      dwellTimer.stop();

      performanceTracker.addTimers(
        navigateToPredictTimer,
        openMarketTimer,
        dwellTimer,
      );

      console.log('Predict BTC Up or Down dwell profiling PoC completed');
      console.log(
        `Navigate to Predict: ${navigateToPredictTimer.getDuration()}ms`,
      );
      console.log(`Open BTC Up or Down: ${openMarketTimer.getDuration()}ms`);
      console.log(`Dwell duration: ${dwellTimer.getDuration()}ms`);
    },
  );
});
