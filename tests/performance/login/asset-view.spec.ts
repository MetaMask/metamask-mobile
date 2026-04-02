import { test as perfTest } from '../../framework/fixture';
import TimerHelper from '../../framework/TimerHelper';
import { loginToAppPlaywright } from '../../flows/wallet.flow';
import { asPlaywrightElement, PlaywrightAssertions , SrpProfile } from '../../framework';
import WalletView from '../../page-objects/wallet/WalletView';
import TokenOverview from '../../page-objects/wallet/TokenOverview';
import {
  PerformanceLogin,
  PerformanceAssetLoading,
} from '../../tags.performance.js';

/* Scenario 8: Asset View, SRP 1 + SRP 2 + SRP 3 */
perfTest.describe(`${PerformanceLogin} ${PerformanceAssetLoading}`, () => {
  perfTest.use({ srpProfile: SrpProfile.PERFORMANCE });
  perfTest(
    'Asset View, SRP 1 + SRP 2 + SRP 3',
    { tag: '@assets-dev-team' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      await loginToAppPlaywright();

      const assetViewScreen = new TimerHelper(
        'Time since the user clicks on the asset view button until the user sees the token overview screen',
        { ios: 600, android: 600 },
        currentDeviceDetails.platform,
      );

      await WalletView.tapOnTokensSection();
      await WalletView.tapOnToken('USDC');

      await assetViewScreen.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(TokenOverview.container),
        );
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(TokenOverview.sendButton),
        );
        // Replicating the logic of the old spec to wait for the todays change to be visible isTodaysChangeVisible method in the TokenOverview wdio screen object
        await PlaywrightAssertions.expectElementToBeVisibleWithSettle(
          asPlaywrightElement(TokenOverview.todaysChange),
          {
            timeout: 10000,
            settleMs: 500,
          },
        );
      });

      performanceTracker.addTimer(assetViewScreen);
    },
  );
});
