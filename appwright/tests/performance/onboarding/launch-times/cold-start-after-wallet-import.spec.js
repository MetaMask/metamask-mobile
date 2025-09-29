import { test } from '../../../../fixtures/performance-test.js';
import TimerHelper from '../../../../utils/TimersHelper.js';
import WelcomeScreen from '../../../../../wdio/screen-objects/Onboarding/OnboardingCarousel.js';
import TermOfUseScreen from '../../../../../wdio/screen-objects/Modals/TermOfUseScreen.js';
import OnboardingScreen from '../../../../../wdio/screen-objects/Onboarding/OnboardingScreen.js';
import CreateNewWalletScreen from '../../../../../wdio/screen-objects/Onboarding/CreateNewWalletScreen.js';
import MetaMetricsScreen from '../../../../../wdio/screen-objects/Onboarding/MetaMetricsScreen.js';
import OnboardingSucessScreen from '../../../../../wdio/screen-objects/OnboardingSucessScreen.js';
import OnboardingSheet from '../../../../../wdio/screen-objects/Onboarding/OnboardingSheet.js';
import WalletAccountModal from '../../../../../wdio/screen-objects/Modals/WalletAccountModal.js';
import SkipAccountSecurityModal from '../../../../../wdio/screen-objects/Modals/SkipAccountSecurityModal.js';
import ImportFromSeedScreen from '../../../../../wdio/screen-objects/Onboarding/ImportFromSeedScreen.js';
import CreatePasswordScreen from '../../../../../wdio/screen-objects/Onboarding/CreatePasswordScreen.js';
import WalletMainScreen from '../../../../../wdio/screen-objects/WalletMainScreen.js';
import AccountListComponent from '../../../../../wdio/screen-objects/AccountListComponent.js';
import AddAccountModal from '../../../../../wdio/screen-objects/Modals/AddAccountModal.js';
import { login, onboardingFlowImportSRP } from '../../../../utils/Flows.js';
import SendScreen from '../../../../../wdio/screen-objects/SendScreen.js';
import ConfirmationScreen from '../../../../../wdio/screen-objects/ConfirmationScreen.js';
import WalletActionModal from '../../../../../wdio/screen-objects/Modals/WalletActionModal.js';
import AmountScreen from '../../../../../wdio/screen-objects/AmountScreen.js';
import MultichainAccountEducationModal from '../../../../../wdio/screen-objects/Modals/MultichainAccountEducationModal.js';
import AppwrightSelectors from '../../../../../wdio/helpers/AppwrightSelectors.js';
import LoginScreen from '../../../../../wdio/screen-objects/LoginScreen.js';

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
  MultichainAccountEducationModal.device = device;
  LoginScreen.device = device;

  await onboardingFlowImportSRP(device, process.env.TEST_SRP_2, 120000);
  // await importSRPFlow(device, process.env.TEST_SRP_2);
  // await importSRPFlow(device, process.env.TEST_SRP_3);
  await AppwrightSelectors.terminateApp(device);
  await AppwrightSelectors.activateApp(device);
  await LoginScreen.waitForScreenToDisplay();
  await login(device, { scenarioType: 'onboarding', skipIntro: true }); // Skip intro screens on second login

  const timer1 = new TimerHelper(
    'Time since the user clicks on unlock button, until the app unlocks',
  );
  const timer2 = new TimerHelper(
    'Time since the user closes the multichain account education modal, until the wallet main screen appears',
  );

  timer2.start();
  await WalletMainScreen.isMainWalletViewVisible();
  timer2.stop();

  performanceTracker.addTimer(timer2);
  await performanceTracker.attachToTest(testInfo);
});
