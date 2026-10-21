import {
  DeferredRenderPoint,
  DeferredRenderScreenIds,
  deferredRenderProbeId,
} from '../../../app/hooks/performance/deferredRenderPerformanceIds';
import { loginToAppPlaywright } from '../../flows/wallet.flow';
import { dismissPerpsOnboardingTutorialIfPresent } from '../../flows/perps.flow';
import { Assertions, Matchers, Utilities } from '../../framework';
import { test as perfTest } from '../../framework/fixtures/playwright';
import TimerHelper from '../../framework/TimerHelper';
import PerpsMarketDetailsView from '../../page-objects/Perps/PerpsMarketDetailsView';
import PerpsMarketListView from '../../page-objects/Perps/PerpsMarketListView';
import WalletView from '../../page-objects/wallet/WalletView';
import {
  Performance,
  PerformanceDeferredRender,
  PerformanceLogin,
} from '../../tags.performance.js';
import { waitForAppScreenTtc } from '../utils/readScreenTtc';
import {
  assertDeferredRenderChartDataFilled,
  assertPerpsAdvancedChartPath,
  recordDeferredRenderProbes,
} from './helpers/deferredRenderTtc';

const SCREEN_THRESHOLD = { ios: 20_000, android: 20_000 };
const CHART_THRESHOLD = { ios: 45_000, android: 45_000 };

/* Perps market details (lite) for BTC: render versus chart network. */
perfTest.describe(
  `${Performance} ${PerformanceLogin} ${PerformanceDeferredRender}`,
  () => {
    perfTest(
      'Perps market details deferred render, BTC',
      { tag: '@mm-perps-engineering-team' },
      async ({ currentDeviceDetails, performanceTracker }) => {
        await loginToAppPlaywright();

        const detailsTimer = new TimerHelper(
          'Time since the user taps perps-market-row-item-BTC until perps-market-details-view is visible',
          SCREEN_THRESHOLD,
          currentDeviceDetails.platform,
        );
        const chartTimer = new TimerHelper(
          'Time since perps market details are visible until the chart is ready',
          CHART_THRESHOLD,
          currentDeviceDetails.platform,
        );

        await WalletView.scrollAndTapPerpsSection();
        await dismissPerpsOnboardingTutorialIfPresent();
        await PerpsMarketListView.openMarketListFromHomeSearch();
        await PerpsMarketListView.tapMarketRowItemBTC();

        await detailsTimer.measure(async () => {
          await Assertions.expectElementToBeVisible(
            PerpsMarketDetailsView.container,
            {
              timeout: SCREEN_THRESHOLD.android,
              description: 'perps-market-details-view',
            },
          );
        });

        await chartTimer.measure(async () => {
          const skeletonAppeared = await Utilities.isElementVisible(
            Matchers.getElementByID('advanced-chart-skeleton'),
            5_000,
          );
          await assertDeferredRenderChartDataFilled(
            DeferredRenderScreenIds.PERPS_MARKET_DETAILS,
          );
          await assertPerpsAdvancedChartPath({ skeletonAppeared });
          await Assertions.expectElementToNotBeVisible(
            Matchers.getElementByID('perps-market-details-view-chart-skeleton'),
            {
              timeout: CHART_THRESHOLD.android,
              description: 'perps-market-details-view-chart-skeleton hidden',
            },
          );
          await Assertions.expectElementToNotBeVisible(
            Matchers.getElementByID('advanced-chart-skeleton'),
            {
              timeout: CHART_THRESHOLD.android,
              description: 'advanced-chart-skeleton hidden',
            },
          );
          await waitForAppScreenTtc(
            deferredRenderProbeId(
              DeferredRenderScreenIds.PERPS_MARKET_DETAILS,
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
          screenId: DeferredRenderScreenIds.PERPS_MARKET_DETAILS,
        });
      },
    );
  },
);
