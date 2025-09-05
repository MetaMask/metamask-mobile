import { test } from '../../fixtures/performance-test.js';

import { PerformanceTracker } from '../../reporters/PerformanceTracker.js';

import LoginScreen from '../../../wdio/screen-objects/LoginScreen.js';
import TimerHelper from '../../utils/TimersHelper.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';

import AccountListComponent from '../../../wdio/screen-objects/AccountListComponent.js';
import AddAccountModal from '../../../wdio/screen-objects/Modals/AddAccountModal.js';
import WalletActionModal from '../../../wdio/screen-objects/Modals/WalletActionModal.js';
import SwapScreen from '../../../wdio/screen-objects/SwapScreen.js';
import TabBarModal from '../../../wdio/screen-objects/Modals/TabBarModal.js';
import NetworkEducationModal from '../../../wdio/screen-objects/Modals/NetworkEducationModal.js';
import NetworksScreen from '../../../wdio/screen-objects/NetworksScreen.js';
import BridgeScreen from '../../../wdio/screen-objects/BridgeScreen.js';
import { login } from '../../utils/Flows.js';

test('Cross-chain swap flow - ETH to SOL - 50+ accounts, SRP 1 + SRP 2 + SRP 3', async ({
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
  NetworkEducationModal.device = device;
  NetworksScreen.device = device;
  BridgeScreen.device = device;

  await login(device, 'swap');
  // await importSRPFlow(device, process.env.TEST_SRP_2);

  const timer1 = new TimerHelper(
    'Time since the user clicks on the "Swap" button until the swap page is loaded',
  );
  timer1.start();

  await WalletMainScreen.tapSwapButton();
  await BridgeScreen.isVisible();
  timer1.stop();

  await BridgeScreen.selectNetworkAndTokenTo('Solana', 'SOL');
  await BridgeScreen.enterSourceTokenAmount('1');

  const timer2 = new TimerHelper(
    'Time since the user enters the amount until the quote is displayed',
  );

  timer2.start();
  await BridgeScreen.isQuoteDisplayed();
  timer2.stop();
  performanceTracker.addTimer(timer1);
  performanceTracker.addTimer(timer2);
  await performanceTracker.attachToTest(testInfo);
});
