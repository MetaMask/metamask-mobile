import { test } from '../../../../fixtures/performance-test.js';
import TimerHelper from '../../../../utils/TimersHelper.js';
import WalletMainScreen from '../../../../../wdio/screen-objects/WalletMainScreen.js';
import { login } from '../../../../utils/Flows.js';

import AppwrightGestures from '../../../../../e2e/framework/AppwrightGestures';
import LoginScreen from '../../../../../wdio/screen-objects/LoginScreen.js';

import TabBarModal from '../../../../../wdio/screen-objects/Modals/TabBarModal.js';
import BrowserScreen from '../../../../../wdio/screen-objects/BrowserObject/BrowserScreen.js';
import AddressBarScreen from '../../../../../wdio/screen-objects/BrowserObject/AddressBarScreen.js';
import ExternalWebsitesScreen from '../../../../../wdio/screen-objects/BrowserObject/ExternalWebsitesScreen.js';
import AccountApprovalModal from '../../../../../wdio/screen-objects/Modals/AccountApprovalModal.js';
import SettingsScreen from '../../../../../wdio/screen-objects/SettingsScreen.js';

// There is a bug in this flow specifically on the samsung s23 device.
test('Measure Warm Start: Login To Wallet Screen', async ({
  device,
  performanceTracker,
}, testInfo) => {
  AddressBarScreen.device = device;
  BrowserScreen.device = device;
  TabBarModal.device = device;
  LoginScreen.device = device;
  WalletMainScreen.device = device;
  ExternalWebsitesScreen.device = device;
  AccountApprovalModal.device = device;
  SettingsScreen.device = device;

  await login(device);

  await WalletMainScreen.tapOnBurgerMenu();
  await SettingsScreen.tapSecurityAndPrivacy();
  await SettingsScreen.tapLockOption();
  await AppwrightGestures.backgroundApp(device, 10);
  await AppwrightGestures.activateApp(device);
  await LoginScreen.waitForScreenToDisplay();
  await login(device);

  const timer1 = new TimerHelper(
    'Time since the user clicks on unlock button, until the app unlocks',
  );
  timer1.start();
  await WalletMainScreen.isMainWalletViewVisible();
  timer1.stop();
  performanceTracker.addTimer(timer1);
  await performanceTracker.attachToTest(testInfo);
});
