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

  const balanceVisibleTimer = new TimerHelper(
    'Time since the user navigates to wallet tab until the balance text is visible',
  );
  const balancesLoadedTimer = new TimerHelper(
    'Time since the user navigates to wallet tab until all token balances are loaded',
  );

  balanceVisibleTimer.start();
  balancesLoadedTimer.start();
  await TabBarModal.tapWalletButton();

  await WalletMainScreen.isTotalBalanceVisible();
  balanceVisibleTimer.stop();

  await WalletMainScreen.isTokenBalancesLoaded();
  balancesLoadedTimer.stop();

  performanceTracker.addTimer(balanceVisibleTimer);
  performanceTracker.addTimer(balancesLoadedTimer);

  await performanceTracker.attachToTest(testInfo);
});
