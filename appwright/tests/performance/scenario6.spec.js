import { test } from 'appwright';

import { PerformanceTracker } from '../../reporters/PerformanceTracker.js';

import LoginScreen from '../../../wdio/screen-objects/LoginScreen.js';
import TimerHelper from '../../utils/TimersHelper.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';

import AccountListComponent from '../../../wdio/screen-objects/AccountListComponent.js';
import AddAccountModal from '../../../wdio/screen-objects/Modals/AddAccountModal.js';
import WalletActionModal from '../../../wdio/screen-objects/Modals/WalletActionModal.js';
import SwapScreen from '../../../wdio/screen-objects/SwapScreen.js';
import TabBarModal from '../../../wdio/screen-objects/Modals/TabBarModal.js';
import { importSRPFlow } from '../../utils/Flows.js';

test('Swap flow - ETH to USDC, SRP 1 + SRP 2 + SRP 3', async ({
  device,
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

  await LoginScreen.typePassword('123123123');
  await LoginScreen.tapUnlockButton();
  await importSRPFlow(device, process.env.TEST_SRP_2);

  const swapLoadTimer = new TimerHelper(
    'Time since the user clicks on the "Swap" button until the swap page is loaded',
  );
  swapLoadTimer.start();
  // await TabBarModal.tapActionButton();
  await WalletActionModal.tapSwapButton();
  swapLoadTimer.stop();
  const swapTimer = new TimerHelper(
    'Time since the user enters the amount until the quote is displayed',
  );
  await SwapScreen.selectNetworkAndTokenTo('Ethereum', 'USDC');
  await SwapScreen.enterSourceTokenAmount('1');
  await SwapScreen.tapGetQuotes('Ethereum');
  swapTimer.start();
  await SwapScreen.isQuoteDisplayed('Ethereum');
  swapTimer.stop();
  const performanceTracker = new PerformanceTracker();
  performanceTracker.addTimer(swapLoadTimer);
  performanceTracker.addTimer(swapTimer);
  await performanceTracker.attachToTest(testInfo);
});
