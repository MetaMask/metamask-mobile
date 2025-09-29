import { test } from '../../../../fixtures/performance-test.js';
import TimerHelper from '../../../../utils/TimersHelper.js';
import WalletMainScreen from '../../../../../wdio/screen-objects/WalletMainScreen.js';
import { login } from '../../../../utils/Flows.js';

import AppwrightSelectors from '../../../../../wdio/helpers/AppwrightSelectors.js';
import LoginScreen from '../../../../../wdio/screen-objects/LoginScreen.js';

import TabBarModal from '../../../../../wdio/screen-objects/Modals/TabBarModal.js';
import BrowserScreen from '../../../../../wdio/screen-objects/BrowserObject/BrowserScreen.js';
import AddressBarScreen from '../../../../../wdio/screen-objects/BrowserObject/AddressBarScreen.js';
import ExternalWebsitesScreen from '../../../../../wdio/screen-objects/BrowserObject/ExternalWebsitesScreen.js';
import AccountApprovalModal from '../../../../../wdio/screen-objects/Modals/AccountApprovalModal.js';

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

  await login(device);

  await TabBarModal.tapBrowserButton();

  /*
    These steps are too flaky. Commenting out for now.

  // await BrowserScreen.isScreenContentDisplayed();
  // await BrowserScreen.tapUrlBar();
  // await AddressBarScreen.tapClearButton();
  // await AddressBarScreen.editUrlInput('https://metamask.github.io/test-dapp/');

  // await AddressBarScreen.submitUrlWebsite();
  // await ExternalWebsitesScreen.isTestDappDisplayed();

  // await ExternalWebsitesScreen.tapDappConnectButton();
  // console.log('Waiting for 10 seconds');
  // await AccountApprovalModal.tapConnectButtonByText();
  // console.log('Waiting for 30 seconds');
*/
  await TabBarModal.tapWalletButton();
  await AppwrightSelectors.backgroundApp(device, 30);
  await AppwrightSelectors.activateApp(device);
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
