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

/* Scenario 5: Perps add funds */
test('Perps add funds', async ({ device, performanceTracker }, testInfo) => {
  test.setTimeout(10 * 60 * 1000); // 10 minutes

  const selectPerpsMainScreenTimer = new TimerHelper(
    'Select Perps Main Screen',
    { ios: 1500, android: 2500 },
    device,
  );
  const openAddFundsTimer = new TimerHelper(
    'Open Add Funds',
    { ios: 5000, android: 4500 },
    device,
  );
  const getQuoteTimer = new TimerHelper(
    'Get Quote',
    { ios: 6000, android: 7000 },
    device,
  );
  await screensSetup(device);

  await login(device);
  await TabBarModal.tapActionButton();

  // Open Perps Main Screen
  await selectPerpsMainScreenTimer.measure(() =>
    WalletActionModal.tapPerpsButton(),
  );

  // Skip tutorial
  await PerpsTutorialScreen.tapSkip();

  await PerpsTutorialScreen.tapAddFunds();
  // Open Add Funds flow
  await openAddFundsTimer.measure(async () => {
    await PerpsDepositScreen.isAmountInputVisible();
  });

  await PerpsDepositScreen.fillUsdAmount(5);
  // Get quote
  await getQuoteTimer.measure(async () => {
    await PerpsDepositScreen.isAddFundsVisible();
    await PerpsDepositScreen.isTotalVisible();
  });

  performanceTracker.addTimers(
    selectPerpsMainScreenTimer,
    openAddFundsTimer,
    getQuoteTimer,
  );
  await performanceTracker.attachToTest(testInfo);
});
