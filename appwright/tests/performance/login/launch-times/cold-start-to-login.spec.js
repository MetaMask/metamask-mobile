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
import { login } from '../../../../utils/Flows.js';
import ConfirmationScreen from '../../../../../wdio/screen-objects/ConfirmationScreen.js';
import WalletActionModal from '../../../../../wdio/screen-objects/Modals/WalletActionModal.js';
import AmountScreen from '../../../../../wdio/screen-objects/AmountScreen.js';
import AppwrightGestures from '../../../../../e2e/framework/AppwrightGestures';
import LoginScreen from '../../../../../wdio/screen-objects/LoginScreen.js';

test('Cold Start: Measure ColdStart To Login Screen', async ({
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
  ConfirmationScreen.device = device;
  AmountScreen.device = device;
  LoginScreen.device = device;
  await login(device);
  await WalletMainScreen.waitForBalanceToStabilize();
  // await importSRPFlow(device, process.env.TEST_SRP_2);
  // await importSRPFlow(device, process.env.TEST_SRP_3);
  await AppwrightGestures.terminateApp(device);
  await AppwrightGestures.activateApp(device);
  const timer1 = new TimerHelper(
    'Time since the the app is launched, until login screen appears',
    { ios: 1000, android: 3000 },
    device,
  );
  await timer1.measure(() => LoginScreen.waitForScreenToDisplay());
  performanceTracker.addTimer(timer1);
  await performanceTracker.attachToTest(testInfo);
});
