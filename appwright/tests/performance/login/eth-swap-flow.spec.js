import { test } from '../../../fixtures/performance-test.js';

import LoginScreen from '../../../../wdio/screen-objects/LoginScreen.js';
import TimerHelper from '../../../utils/TimersHelper.js';
import WalletMainScreen from '../../../../wdio/screen-objects/WalletMainScreen.js';
import BridgeScreen from '../../../../wdio/screen-objects/BridgeScreen.js';
import AccountListComponent from '../../../../wdio/screen-objects/AccountListComponent.js';
import AddAccountModal from '../../../../wdio/screen-objects/Modals/AddAccountModal.js';
import WalletActionModal from '../../../../wdio/screen-objects/Modals/WalletActionModal.js';
import SwapScreen from '../../../../wdio/screen-objects/SwapScreen.js';
import TabBarModal from '../../../../wdio/screen-objects/Modals/TabBarModal.js';
import { login } from '../../../utils/Flows.js';

/* Scenario 6: Swap flow - ETH to LINK, SRP 1 + SRP 2 + SRP 3 */
test('Swap flow - ETH to LINK, SRP 1 + SRP 2 + SRP 3', async ({
  device,
  performanceTracker,
}, testInfo) => {
  LoginScreen.device = device;

  WalletMainScreen.device = device;
  AccountListComponent.device = device;
  AddAccountModal.device = device;
  WalletActionModal.device = device;
  SwapScreen.device = device;
  TabBarModal.device = device;
  WalletMainScreen.device = device;
  AccountListComponent.device = device;
  AddAccountModal.device = device;
  BridgeScreen.device = device;
  await login(device);

  const swapLoadTimer = new TimerHelper(
    'Time since the user clicks on the "Swap" button until the swap page is loaded',
    { ios: 2000, android: 2500 },
    device,
  );

  await WalletMainScreen.tapSwapButton();
  await swapLoadTimer.measure(() => BridgeScreen.isVisible());

  const swapTimer = new TimerHelper(
    'Time since the user enters the amount until the quote is displayed',
    { ios: 9000, android: 7000 },
    device,
  );
  await BridgeScreen.selectNetworkAndTokenTo('Ethereum', 'LINK');
  await BridgeScreen.enterSourceTokenAmount('1');

  await swapTimer.measure(() => BridgeScreen.isQuoteDisplayed());

  performanceTracker.addTimers(swapLoadTimer, swapTimer);
  await performanceTracker.attachToTest(testInfo);
});
