import {
  DeferredRenderPoint,
  DeferredRenderScreenIds,
  deferredRenderProbeId,
} from '../../../app/hooks/performance/deferredRenderPerformanceIds';
import { loginToAppPlaywright } from '../../flows/wallet.flow';
import { Assertions, Gestures, Matchers, Utilities } from '../../framework';
import { test as perfTest } from '../../framework/fixtures/playwright';
import TimerHelper from '../../framework/TimerHelper';
import PredictHome from '../../page-objects/Predict/PredictHome';
import PredictMarketList from '../../page-objects/Predict/PredictMarketList';
import WalletView from '../../page-objects/wallet/WalletView';
import {
  Performance,
  PerformanceDeferredRender,
} from '../../tags.performance.js';
import { waitForAppScreenTtc } from '../utils/readScreenTtc';
import { recordDeferredRenderProbes } from './helpers/deferredRenderTtc';

const SCREEN_THRESHOLD = { ios: 20_000, android: 20_000 };
const CHART_THRESHOLD = { ios: 45_000, android: 45_000 };
const HOMEPAGE_ROW_PROBE_MS = 4_000;

/**
 * Opens BTC Up or Down details from the homepage row when that A/B arm is
 * showing, otherwise from Predict home / the market list.
 */
async function openBtcUpDownDetails(): Promise<void> {
  const homepageRow = Matchers.getElementByID(
    'homepage-predict-discovery-btc-row',
  );
  if (await Utilities.isElementVisible(homepageRow, HOMEPAGE_ROW_PROBE_MS)) {
    await Gestures.waitAndTap(homepageRow, {
      elemDescription: 'homepage-predict-discovery-btc-row',
    });
    return;
  }

  await WalletView.scrollAndTapPredictionsSection();

  try {
    await PredictHome.waitForScreenToDisplay({
      timeout: SCREEN_THRESHOLD.android,
      description: 'predict-home-container',
    });
  } catch {
    await Assertions.expectElementToBeVisible(PredictMarketList.container, {
      timeout: SCREEN_THRESHOLD.android,
      description: 'predict-market-list-container',
    });
  }

  const btcCard = Matchers.getElementByLabel('BTC Up or Down');
  try {
    await Gestures.scrollToElement(btcCard, 'predict-home-scroll-view', {
      direction: 'down',
      timeout: SCREEN_THRESHOLD.android,
    });
  } catch {
    // Predict feed uses a different scroller. The label tap below still waits.
  }
  await Gestures.waitAndTap(btcCard, {
    elemDescription: 'BTC Up or Down card',
    timeout: SCREEN_THRESHOLD.android,
  });
}

/* Predict crypto up/down details for BTC 5m: render versus chart network. */
perfTest.describe(`${Performance} ${PerformanceDeferredRender}`, () => {
  perfTest(
    'Predict crypto up/down details deferred render, BTC',
    { tag: '@team-predict' },
    async ({ currentDeviceDetails, performanceTracker }) => {
      await loginToAppPlaywright();

      const detailsTimer = new TimerHelper(
        'Time since the user opens BTC Up or Down until predict-crypto-up-down-details-screen is visible',
        SCREEN_THRESHOLD,
        currentDeviceDetails.platform,
      );
      const chartTimer = new TimerHelper(
        'Time since predict up/down details are visible until the liveline chart is ready',
        CHART_THRESHOLD,
        currentDeviceDetails.platform,
      );

      await openBtcUpDownDetails();

      await detailsTimer.measure(async () => {
        await Assertions.expectElementToBeVisible(
          Matchers.getElementByID('predict-crypto-up-down-details-screen'),
          {
            timeout: SCREEN_THRESHOLD.android,
            description: 'predict-crypto-up-down-details-screen',
          },
        );
      });

      await chartTimer.measure(async () => {
        await Assertions.expectElementToBeVisible(
          Matchers.getElementByID('predict-crypto-up-down-chart-container'),
          {
            timeout: CHART_THRESHOLD.android,
            description: 'predict-crypto-up-down-chart-container',
          },
        );
        await Assertions.expectElementToBeVisible(
          Matchers.getElementByID('liveline-chart-webview'),
          {
            timeout: CHART_THRESHOLD.android,
            description: 'liveline-chart-webview',
          },
        );
        await Assertions.expectElementToNotBeVisible(
          Matchers.getElementByID('liveline-chart-loading'),
          {
            timeout: CHART_THRESHOLD.android,
            description: 'liveline-chart-loading hidden',
          },
        );
        await waitForAppScreenTtc(
          deferredRenderProbeId(
            DeferredRenderScreenIds.PREDICT_UPDOWN_DETAILS,
            DeferredRenderPoint.CHART_READY,
          ),
          { timeoutMs: CHART_THRESHOLD.android },
        );
      });

      performanceTracker.addTimer(detailsTimer);
      performanceTracker.addTimer(chartTimer);
      await recordDeferredRenderProbes({
        performanceTracker,
        platform: currentDeviceDetails.platform,
        screenId: DeferredRenderScreenIds.PREDICT_UPDOWN_DETAILS,
      });
    },
  );
});
