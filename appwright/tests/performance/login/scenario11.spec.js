import { test } from '../../../fixtures/performance-test.js';
import TimerHelper from '../../../utils/TimersHelper.js';
import WalletMainScreen from '../../../../wdio/screen-objects/WalletMainScreen.js';
import { dismissSystemDialogs, login } from '../../../utils/Flows.js';

import AppwrightSelectors from '../../../../wdio/helpers/AppwrightSelectors.js';
import LoginScreen from '../../../../wdio/screen-objects/LoginScreen.js';

import TabBarModal from '../../../../wdio/screen-objects/Modals/TabBarModal.js';
import BrowserScreen from '../../../../wdio/screen-objects/BrowserObject/BrowserScreen.js';
import AddressBarScreen from '../../../../wdio/screen-objects/BrowserObject/AddressBarScreen.js';
import ExternalWebsitesScreen from '../../../../wdio/screen-objects/BrowserObject/ExternalWebsitesScreen.js';
import AccountApprovalModal from '../../../../wdio/screen-objects/Modals/AccountApprovalModal.js';

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
  await login(device, 'login');
  await dismissSystemDialogs(device);
  await TabBarModal.tapBrowserButton();
  await BrowserScreen.isScreenContentDisplayed();
  await BrowserScreen.tapUrlBar();
  await AddressBarScreen.tapClearButton();
  await AddressBarScreen.editUrlInput('https://metamask.github.io/test-dapp/');

  await AddressBarScreen.submitUrlWebsite();
  await ExternalWebsitesScreen.isTestDappDisplayed();
  await AppwrightSelectors.scrollDown(device);
  await ExternalWebsitesScreen.tapDappConnectButton();
  console.log('Waiting for 10 seconds');
  await AccountApprovalModal.tapConnectButtonByText();
  console.log('Waiting for 30 seconds');
  await TabBarModal.tapWalletButton();
  await AppwrightSelectors.backgroundApp(device, 31);
  await AppwrightSelectors.activateApp(device);
  await LoginScreen.waitForScreenToDisplay();
  await LoginScreen.typePassword('123456789');
  await LoginScreen.tapTitle();
  await LoginScreen.tapUnlockButton();
  const timer1 = new TimerHelper(
    'Time since the user clicks on unlock button, until the app unlocks',
  );
  timer1.start();
  await WalletMainScreen.isMainWalletViewVisible();
  timer1.stop();
  performanceTracker.addTimer(timer1);
  await performanceTracker.attachToTest(testInfo);
});

test('Measure Warm Start: Login Screen', async ({
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
  await dismissSystemDialogs(device);
  const timer1 = new TimerHelper(
    'Time since the user open the app again and the login screen appears',
  );
  await AppwrightSelectors.backgroundApp(device, 30);
  timer1.start();
  await AppwrightSelectors.activateApp(device);
  await LoginScreen.waitForScreenToDisplay();
  timer1.stop();
  performanceTracker.addTimer(timer1);
  await performanceTracker.attachToTest(testInfo);
});
