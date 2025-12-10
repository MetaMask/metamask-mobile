import { test } from '../../../fixtures/performance-test.js';

import TimerHelper from '../../../utils/TimersHelper.js';
import LoginScreen from '../../../../wdio/screen-objects/LoginScreen.js';
import WalletMainScreen from '../../../../wdio/screen-objects/WalletMainScreen.js';
import TabBarModal from '../../../../wdio/screen-objects/Modals/TabBarModal.js';
import WalletActionModal from '../../../../wdio/screen-objects/Modals/WalletActionModal.js';
import PerpsTutorialScreen from '../../../../wdio/screen-objects/PerpsTutorialScreen.js';
import PerpsMarketListView from '../../../../wdio/screen-objects/PerpsMarketListView.js';
import PerpsTabView from '../../../../wdio/screen-objects/PerpsTabView.js';
import PerpsDepositScreen from '../../../../wdio/screen-objects/PerpsDepositScreen.js';
import { login } from '../../../utils/Flows.js';

async function screensSetup(device) {
  const screens = [
    LoginScreen,
    WalletMainScreen,
    TabBarModal,
    WalletActionModal,
    PerpsTutorialScreen,
    PerpsMarketListView,
    PerpsTabView,
    PerpsDepositScreen,
  ];
  screens.forEach((screen) => {
    screen.device = device;
  });
}

/* Scenario 5: Perps onboarding + add funds 10 USD ARB.USDC */
// TODO: Fix this test: https://consensyssoftware.atlassian.net/browse/MMQA-1190
test('Perps add funds', async ({ device, performanceTracker }, testInfo) => {
  test.setTimeout(10 * 60 * 1000); // 10 minutes

  const selectPerpsMainScreenTimer = new TimerHelper(
    'Select Perps Main Screen',
  );
  const openAddFundsTimer = new TimerHelper('Open Add Funds');
  const fillAmountTimer = new TimerHelper('Fill amount - 10 USD');
  const continueTimer = new TimerHelper('Continue - 1 click');
  await screensSetup(device);

  await login(device);
  await TabBarModal.tapActionButton();

  // Open Perps Main Screen
  selectPerpsMainScreenTimer.start();
  await WalletActionModal.tapPerpsButton();
  selectPerpsMainScreenTimer.stop();
  performanceTracker.addTimer(selectPerpsMainScreenTimer);

  // Open Tutorial flow
  // await PerpsTutorialScreen.flowTapContinueTutorial(6);

  // Skip tutorial
  await PerpsTutorialScreen.tapSkip();

  // Open Add Funds flow
  openAddFundsTimer.start();
  await PerpsTutorialScreen.tapAddFunds();
  await PerpsDepositScreen.isAmountInputVisible();
  openAddFundsTimer.stop();
  performanceTracker.addTimer(openAddFundsTimer);

  // Select pay token
  // selectPayTokenTimer.start();
  // await PerpsDepositScreen.tapPayWith();
  // await PerpsDepositScreen.selectPayTokenByText('ETH');
  // selectPayTokenTimer.stop();
  // performanceTracker.addTimer(selectPayTokenTimer);

  // Fill amount and try until successful
  fillAmountTimer.start();

  await PerpsDepositScreen.fillUsdAmount(5);
  await PerpsDepositScreen.isAddFundsVisible({ timeout: 5000 });
  await PerpsDepositScreen.isTotalVisible();
  fillAmountTimer.stop();
  performanceTracker.addTimer(fillAmountTimer);
  await performanceTracker.attachToTest(testInfo);
});
