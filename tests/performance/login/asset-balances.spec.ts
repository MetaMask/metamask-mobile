import { test } from '../../framework/fixture/index';

import TimerHelper from '../../framework/TimerHelper';

import WalletView from '../../page-objects/wallet/WalletView';
import { loginToAppPlaywright } from '../../flows/wallet.flow';
import {
  PerformanceLogin,
  PerformanceAssetLoading,
} from '../../tags.performance.js';
import { SrpProfile } from '../../framework';

/* Scenario: Aggregated Balance Loading Time, SRP 1 + SRP 2 + SRP 3 */
test.describe(`${PerformanceLogin} ${PerformanceAssetLoading}`, () => {
  test.use({ srpProfile: SrpProfile.PERFORMANCE });
  test(
    'Aggregated Balance Loading Time, SRP 1 + SRP 2 + SRP 3',
    { tag: '@assets-dev-team' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      await loginToAppPlaywright();

      const balanceStableTimer = new TimerHelper(
        'Time since the user navigates to wallet tab until the balance stabilizes',
        { ios: 25000, android: 40000 },
        currentDeviceDetails.platform,
      );
      await balanceStableTimer.measure(async () => {
        await WalletView.waitForBalanceToStabilize();
      });
      performanceTracker.addTimer(balanceStableTimer);
      // Quality gates validation is performed by the reporter when generating reports
    },
  );
});
