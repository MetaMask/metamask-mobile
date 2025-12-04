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
}, testInfo) => {
  WalletMainScreen.device = device;
  TabBarModal.device = device;
  LoginScreen.device = device;

  await login(device);

  const balanceStableTimer = new TimerHelper(
    'Time since the user navigates to wallet tab until the balance stabilizes',
  );

  balanceStableTimer.start();

  await WalletMainScreen.waitForBalanceToStabilize();
  balanceStableTimer.stop();

  performanceTracker.addTimer(balanceStableTimer);

  await performanceTracker.attachToTest(testInfo);
});
