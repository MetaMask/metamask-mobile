import { test as perfTest } from '../../framework/fixture';
import TimerHelper from '../../framework/TimerHelper';
import { loginToAppPlaywright } from '../../flows/wallet.flow';
import {
  asPlaywrightElement,
  PlaywrightAssertions,
  withSnapshotSettings,
} from '../../framework';
import WalletView from '../../page-objects/wallet/WalletView';
import TokenOverview from '../../page-objects/wallet/TokenOverview';
import {
  PerformanceLogin,
  PerformanceAssetLoading,
} from '../../tags.performance.js';

/* Scenario 8: Asset View, SRP 1 + SRP 2 + SRP 3 */
perfTest.describe(`${PerformanceLogin} ${PerformanceAssetLoading}`, () => {
  perfTest(
    'Asset View, SRP 1 + SRP 2 + SRP 3',
    { tag: '@assets-dev-team' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      await loginToAppPlaywright();

      const assetViewScreen = new TimerHelper(
        'Time since the user clicks on the asset view button until the user sees the token overview screen',
        { ios: 6000, android: 600 },
        currentDeviceDetails.platform,
      );

      await withSnapshotSettings({ snapshotMaxDepth: 45 }, async () => {
        await WalletView.tapOnTokensSection();
        await WalletView.tapOnToken('USDC');
      });

      const priceChartDotEnd = asPlaywrightElement(
        TokenOverview.priceChartDotEnd,
      );

      await assetViewScreen.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisibleWithSettle(
          priceChartDotEnd,
        );
      });

      performanceTracker.addTimer(assetViewScreen);
    },
  );
});
