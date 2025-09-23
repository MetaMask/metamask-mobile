import { test } from '../../../../fixtures/performance-test.js';
import TimerHelper from '../../../../utils/TimersHelper.js';
import WalletMainScreen from '../../../../../wdio/screen-objects/WalletMainScreen.js';
import {
  login,
  dismissMultichainAccountsIntroModal,
} from '../../../../utils/Flows.js';

import AppwrightSelectors from '../../../../../wdio/helpers/AppwrightSelectors.js';
import LoginScreen from '../../../../../wdio/screen-objects/LoginScreen.js';

import TabBarModal from '../../../../../wdio/screen-objects/Modals/TabBarModal.js';
import BrowserScreen from '../../../../../wdio/screen-objects/BrowserObject/BrowserScreen.js';
import AddressBarScreen from '../../../../../wdio/screen-objects/BrowserObject/AddressBarScreen.js';
import ExternalWebsitesScreen from '../../../../../wdio/screen-objects/BrowserObject/ExternalWebsitesScreen.js';
import AccountApprovalModal from '../../../../../wdio/screen-objects/Modals/AccountApprovalModal.js';

test('Measure Warm Start: Warm Start to Login Screen', async ({
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

  await login(device, 'login');

  const timer1 = new TimerHelper(
    'Time since the user open the app again and the login screen appears',
  );
  await AppwrightSelectors.backgroundApp(device, 30);
  timer1.start();
  await AppwrightSelectors.activateApp(device);
  await dismissMultichainAccountsIntroModal(device);
  await LoginScreen.waitForScreenToDisplay();
  timer1.stop();
  performanceTracker.addTimer(timer1);
  await performanceTracker.attachToTest(testInfo);
});
