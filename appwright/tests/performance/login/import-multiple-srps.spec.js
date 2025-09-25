import { test } from '../../../fixtures/performance-test.js';

import LoginScreen from '../../../../wdio/screen-objects/LoginScreen.js';
import WalletMainScreen from '../../../../wdio/screen-objects/WalletMainScreen.js';

import AccountListComponent from '../../../../wdio/screen-objects/AccountListComponent.js';
import AddAccountModal from '../../../../wdio/screen-objects/Modals/AddAccountModal.js';
import WalletActionModal from '../../../../wdio/screen-objects/Modals/WalletActionModal.js';
import SwapScreen from '../../../../wdio/screen-objects/SwapScreen.js';
import TabBarModal from '../../../../wdio/screen-objects/Modals/TabBarModal.js';
import { importSRPFlow, login } from '../../../utils/Flows.js';

/* Scenario 4: Import SRP with +50 accounts, SRP 1, SRP 2, SRP 3 */
test('Import SRP with +50 accounts, SRP 1, SRP 2, SRP 3', async ({
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

  await login(device);

  await WalletMainScreen.isTokenVisible('ETH');
  const timers = await importSRPFlow(device, process.env.TEST_SRP_2);
  await WalletMainScreen.isTokenVisible('ETH');

  await WalletMainScreen.tapIdenticon();
  timers.forEach((timer) => performanceTracker.addTimer(timer));
  await performanceTracker.attachToTest(testInfo);
});
