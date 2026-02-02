import { test } from '../../../fixtures/performance-test.js';

import TimerHelper from '../../../utils/TimersHelper.js';
import WalletMainScreen from '../../../../wdio/screen-objects/WalletMainScreen.js';
import TabBarModal from '../../../../wdio/screen-objects/Modals/TabBarModal.js';
import LoginScreen from '../../../../wdio/screen-objects/LoginScreen.js';
import { login } from '../../../utils/Flows.js';

/* Scenario: Aggregated Balance Loading Time, SRP 1 + SRP 2 + SRP 3 */
test('Aggregated Balance Loading Time, SRP 1 + SRP 2 + SRP 3', async ({
  device,
  performanceTracker,
}) => {
  WalletMainScreen.device = device;
  TabBarModal.device = device;
  LoginScreen.device = device;

  await login(device);

  const balanceStableTimer = new TimerHelper(
    'Time since the user navigates to wallet tab until the balance stabilizes',
    { ios: 25000, android: 40000 },
    device,
  );
  await balanceStableTimer.measure(
    async () => await WalletMainScreen.waitForBalanceToStabilize(),
  );
  performanceTracker.addTimer(balanceStableTimer);
  // Quality gates validation is performed by the reporter when generating reports
});
