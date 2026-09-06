import { test as perfTest } from '../../framework/fixtures/playwright';
import TimerHelper from '../../framework/TimerHelper';
import { loginToAppPlaywright } from '../../flows/wallet.flow';
import { AppiumAssertions } from '../../framework';
import WalletView from '../../page-objects/wallet/WalletView';
import TokenOverview from '../../page-objects/wallet/TokenOverview';
import {
  pullBrowserStackProfiler,
  startBrowserStackProfiler,
  stopBrowserStackProfiler,
} from '../../framework/services/appium/BrowserStackProfiler';
import {
  Performance,
  PerformanceLogin,
  PerformanceAssetLoading,
} from '../../tags.performance.js';

/* Scenario 8: Asset View, SRP 1 + SRP 2 + SRP 3 */
perfTest.describe(
  `${Performance} ${PerformanceLogin} ${PerformanceAssetLoading}`,
  () => {
    perfTest(
      'Asset View, SRP 1 + SRP 2 + SRP 3',
      { tag: '@assets-dev-team' },
      async (
        { currentDeviceDetails, driver, performanceTracker },
        testInfo,
      ) => {
        await loginToAppPlaywright();

        const assetViewScreen = new TimerHelper(
          'Time since the user clicks on the asset view button until the user sees the token overview screen',
          { ios: 6000, android: 6500 },
          currentDeviceDetails.platform,
        );

        const profilingEnabled = currentDeviceDetails.platform === 'android';
        if (profilingEnabled) {
          await startBrowserStackProfiler(
            driver,
            currentDeviceDetails.platform,
          );
        }

        await WalletView.tapOnTokensSection();

        try {
          await WalletView.tapOnToken('ETH');
          await assetViewScreen.measure(async () => {
            await AppiumAssertions.expectElementToBeVisible(
              TokenOverview.priceChartContainer,
            );
            await AppiumAssertions.expectElementToBeVisible(
              TokenOverview.container,
            );
          });

          performanceTracker.addTimer(assetViewScreen);
        } finally {
          if (profilingEnabled) {
            const profileFileName = await stopBrowserStackProfiler(
              driver,
              currentDeviceDetails.platform,
            );
            await pullBrowserStackProfiler(
              driver,
              testInfo,
              currentDeviceDetails.platform,
              profileFileName,
            );
          }
        }
      },
    );
  },
);
