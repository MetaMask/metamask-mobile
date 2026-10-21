import {
  DeferredRenderPoint,
  DeferredRenderScreenIds,
  deferredRenderProbeId,
} from '../../../app/hooks/performance/deferredRenderPerformanceIds';
import { loginToAppPlaywright } from '../../flows/wallet.flow';
import { Assertions, Matchers } from '../../framework';
import { test as perfTest } from '../../framework/fixtures/playwright';
import TimerHelper from '../../framework/TimerHelper';
import WalletView from '../../page-objects/wallet/WalletView';
import TokenOverview from '../../page-objects/wallet/TokenOverview';
import {
  Performance,
  PerformanceDeferredRender,
  PerformanceLogin,
} from '../../tags.performance.js';
import { waitForAppScreenTtc } from '../utils/readScreenTtc';
import {
  assertDeferredRenderChartDataFilled,
  recordDeferredRenderProbes,
} from './helpers/deferredRenderTtc';

const SCREEN_THRESHOLD = { ios: 20_000, android: 20_000 };
const CHART_THRESHOLD = { ios: 45_000, android: 45_000 };

/* Legacy token details for native ETH: render versus chart network. */
perfTest.describe(
  `${Performance} ${PerformanceLogin} ${PerformanceDeferredRender}`,
  () => {
    perfTest(
      'Token details deferred render, native ETH',
      { tag: '@assets-dev-team' },
      async ({ currentDeviceDetails, performanceTracker }) => {
        await loginToAppPlaywright();

        const detailsTimer = new TimerHelper(
          'Time since the user taps asset-ETH until token-asset-overview is visible',
          SCREEN_THRESHOLD,
          currentDeviceDetails.platform,
        );
        const chartTimer = new TimerHelper(
          'Time since token details are visible until the token chart is ready',
          CHART_THRESHOLD,
          currentDeviceDetails.platform,
        );

        await WalletView.tapOnTokensSection();
        await WalletView.tapOnToken('ETH');

        await detailsTimer.measure(async () => {
          await Assertions.expectElementToBeVisible(TokenOverview.container, {
            timeout: SCREEN_THRESHOLD.android,
            description: 'token-asset-overview',
          });
        });

        await chartTimer.measure(async () => {
          await assertDeferredRenderChartDataFilled(
            DeferredRenderScreenIds.TOKEN_DETAILS,
          );
          await Assertions.expectElementToExist(
            Matchers.getElementByID('advanced-chart-touch-container'),
            {
              timeout: CHART_THRESHOLD.android,
              description: 'advanced-chart-touch-container',
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
              DeferredRenderScreenIds.TOKEN_DETAILS,
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
          screenId: DeferredRenderScreenIds.TOKEN_DETAILS,
        });
      },
    );
  },
);
