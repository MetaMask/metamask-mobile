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
test('Cold Start after importing a wallet', async ({
  device,
  performanceTracker,
}, testInfo) => {
  WelcomeScreen.device = device;
  TermOfUseScreen.device = device;
  OnboardingScreen.device = device;
  CreateNewWalletScreen.device = device;
  MetaMetricsScreen.device = device;
  OnboardingSucessScreen.device = device;
  OnboardingSheet.device = device;
  WalletAccountModal.device = device;
  SkipAccountSecurityModal.device = device;
  ImportFromSeedScreen.device = device;
  CreatePasswordScreen.device = device;
  WalletMainScreen.device = device;
  AccountListComponent.device = device;
  AddAccountModal.device = device;
  WalletActionModal.device = device;
  SendScreen.device = device;
  ConfirmationScreen.device = device;
  AmountScreen.device = device;
  LoginScreen.device = device;
  await onboardingFlowImportSRP(device, process.env.TEST_SRP_2);
  // await importSRPFlow(device, process.env.TEST_SRP_2);
  // await importSRPFlow(device, process.env.TEST_SRP_3);
  await AppwrightSelectors.terminateApp(device);

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
  await expect(timer1Duration).toBeLessThan(5000);
});
test('Cold Start on Login Screen After Importing a Wallet', async ({
  device,
  performanceTracker,
}, testInfo) => {
  WelcomeScreen.device = device;
  TermOfUseScreen.device = device;
  OnboardingScreen.device = device;
  CreateNewWalletScreen.device = device;
  MetaMetricsScreen.device = device;
  OnboardingSucessScreen.device = device;
  OnboardingSheet.device = device;
  WalletAccountModal.device = device;
  SkipAccountSecurityModal.device = device;
  ImportFromSeedScreen.device = device;
  CreatePasswordScreen.device = device;
  WalletMainScreen.device = device;
  AccountListComponent.device = device;
  AddAccountModal.device = device;
  WalletActionModal.device = device;
  SendScreen.device = device;
  ConfirmationScreen.device = device;
  AmountScreen.device = device;
  LoginScreen.device = device;
  await onboardingFlowImportSRP(device, process.env.TEST_SRP_2);
  // await importSRPFlow(device, process.env.TEST_SRP_2);
  // await importSRPFlow(device, process.env.TEST_SRP_3);
  await AppwrightSelectors.terminateApp(device);

  await AppwrightSelectors.activateApp(device);
  const timer1 = new TimerHelper(
    'Time since the the app is launched, until login screen appears',
  );
  timer1.start();
  await LoginScreen.waitForScreenToDisplay();
  timer1.stop();
  performanceTracker.addTimer(timer1);
  await performanceTracker.attachToTest(testInfo);
  const timer1Duration = timer1.getDuration();

  await expect(timer1Duration).toBeLessThan(4000);
});

test.skip('Wallet Time To Interact Cold Start on Fresh Install', async ({
  device,
  performanceTracker,
}, testInfo) => {
  OnboardingScreen.device = device;
  const timer1 = new TimerHelper(
    'Time since the the app is installed, until onboarding screen appears',
  );
  timer1.start();
  await OnboardingScreen.isScreenTitleVisible();
  timer1.stop();
  performanceTracker.addTimer(timer1);
  await performanceTracker.attachToTest(testInfo);
  const timer1Duration = timer1.getDuration();

  await expect(timer1Duration).toBeLessThan(
    AppwrightSelectors.isAndroid(device) ? 400 : 700,
  );
});
