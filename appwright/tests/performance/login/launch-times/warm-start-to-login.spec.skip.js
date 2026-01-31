import { test } from '../../../../fixtures/performance-test.js';
import TimerHelper from '../../../../utils/TimersHelper.js';
import WalletMainScreen from '../../../../../wdio/screen-objects/WalletMainScreen.js';
import {
  login,
  dismissMultichainAccountsIntroModal,
} from '../../../../utils/Flows.js';

import AppwrightGestures from '../../../../../tests/framework/AppwrightGestures.js';
import LoginScreen from '../../../../../wdio/screen-objects/LoginScreen.js';

import TabBarModal from '../../../../../wdio/screen-objects/Modals/TabBarModal.js';
import BrowserScreen from '../../../../../wdio/screen-objects/BrowserObject/BrowserScreen.js';
import AddressBarScreen from '../../../../../wdio/screen-objects/BrowserObject/AddressBarScreen.js';
import ExternalWebsitesScreen from '../../../../../wdio/screen-objects/BrowserObject/ExternalWebsitesScreen.js';
import AccountApprovalModal from '../../../../../wdio/screen-objects/Modals/AccountApprovalModal.js';
import { PerformanceLogin, PerformanceLaunch } from '../../../../tags.js';

// There is a bug in this flow specifically on the samsung s23 device.
test.describe(`${PerformanceLogin} ${PerformanceLaunch}`, () => {
  test(
    'Measure Warm Start: Warm Start to Login Screen',
    { tag: '@metamask-mobile-platform' },
    async ({ device, performanceTracker }, testInfo) => {
      AddressBarScreen.device = device;
      BrowserScreen.device = device;
      TabBarModal.device = device;
      LoginScreen.device = device;
      WalletMainScreen.device = device;
      ExternalWebsitesScreen.device = device;
      AccountApprovalModal.device = device;

      await login(device);

      const timer1 = new TimerHelper(
        'Time since the user open the app again and the login screen appears',
        { ios: 1500, android: 1500 },
        device,
      );
      await AppwrightGestures.backgroundApp(device, 30);
      await AppwrightGestures.activateApp(device);
      await timer1.measure(async () => {
        await LoginScreen.waitForScreenToDisplay();
      });

      performanceTracker.addTimer(timer1);
      await performanceTracker.attachToTest(testInfo);
    },
  );
});
