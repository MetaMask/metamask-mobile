import { test } from '../../fixtures/performance-test.js';
import TimerHelper from '../../utils/TimersHelper.js';
import WelcomeScreen from '../../../wdio/screen-objects/Onboarding/OnboardingCarousel.js';
import TermOfUseScreen from '../../../wdio/screen-objects/Modals/TermOfUseScreen.js';
import OnboardingScreen from '../../../wdio/screen-objects/Onboarding/OnboardingScreen.js';
import CreateNewWalletScreen from '../../../wdio/screen-objects/Onboarding/CreateNewWalletScreen.js';
import MetaMetricsScreen from '../../../wdio/screen-objects/Onboarding/MetaMetricsScreen.js';
import OnboardingSucessScreen from '../../../wdio/screen-objects/OnboardingSucessScreen.js';
import OnboardingSheet from '../../../wdio/screen-objects/Onboarding/OnboardingSheet.js';
import WalletAccountModal from '../../../wdio/screen-objects/Modals/WalletAccountModal.js';
import SkipAccountSecurityModal from '../../../wdio/screen-objects/Modals/SkipAccountSecurityModal.js';
import ImportFromSeedScreen from '../../../wdio/screen-objects/Onboarding/ImportFromSeedScreen.js';
import CreatePasswordScreen from '../../../wdio/screen-objects/Onboarding/CreatePasswordScreen.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import AccountListComponent from '../../../wdio/screen-objects/AccountListComponent.js';
import AddAccountModal from '../../../wdio/screen-objects/Modals/AddAccountModal.js';
import { onboardingFlowImportSRP } from '../../utils/Flows.js';
import SendScreen from '../../../wdio/screen-objects/SendScreen.js';
import ConfirmationScreen from '../../../wdio/screen-objects/ConfirmationScreen.js';
import WalletActionModal from '../../../wdio/screen-objects/Modals/WalletActionModal.js';
import AmountScreen from '../../../wdio/screen-objects/AmountScreen.js';

import AppwrightSelectors from '../../../wdio/helpers/AppwrightSelectors.js';
import LoginScreen from '../../../wdio/screen-objects/LoginScreen.js';
import { expect } from 'appwright';
import TabBarModal from '../../../wdio/screen-objects/Modals/TabBarModal.js';
import BrowserScreen from '../../../wdio/screen-objects/BrowserObject/BrowserScreen.js';
import AddressBarScreen from '../../../wdio/screen-objects/BrowserObject/AddressBarScreen.js';
import ExternalWebsitesScreen from '../../../wdio/screen-objects/BrowserObject/ExternalWebsitesScreen.js';
import AccountApprovalModal from '../../../wdio/screen-objects/Modals/AccountApprovalModal.js';

test('Measure Warm Start after Importing a Wallet', async ({
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
  await onboardingFlowImportSRP(device, process.env.TEST_SRP_3);
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
  const timer1Duration = timer1.getDuration();
  console.log(
    `The time it takes the wallet view to appear is: ${timer1Duration}`,
  );
  performanceTracker.addTimer(timer1);
  await performanceTracker.attachToTest(testInfo);
  await expect(timer1Duration).toBeLessThan(4000);
});

test('Measure warm start launch time after Importing a Wallet', async ({
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
  await onboardingFlowImportSRP(device, process.env.TEST_SRP_3);
  await TabBarModal.tapBrowserButton();
  await BrowserScreen.isScreenContentDisplayed();
  await BrowserScreen.tapUrlBar();
  await AddressBarScreen.tapClearButton();
  await AddressBarScreen.editUrlInput('https://metamask.github.io/test-dapp/');

  await AddressBarScreen.submitUrlWebsite();
  await ExternalWebsitesScreen.isTestDappDisplayed();
  await AppwrightSelectors.scrollDown(device);
  await ExternalWebsitesScreen.tapDappConnectButton();
  await AccountApprovalModal.tapConnectButtonByText();
  await TabBarModal.tapWalletButton();
  const timer1 = new TimerHelper(
    'Time since the user open the app again and the login screen appears',
  );
  await AppwrightSelectors.backgroundApp(device, 30);
  timer1.start();
  await AppwrightSelectors.activateApp(device);
  await LoginScreen.waitForScreenToDisplay();
  timer1.stop();
  const timer1Duration = timer1.getDuration();
  console.log(
    `The time it takes the login view to appear is: ${timer1Duration}`,
  );
  performanceTracker.addTimer(timer1);
  await performanceTracker.attachToTest(testInfo);
  await expect(timer1Duration).toBeLessThan(4000);
});
