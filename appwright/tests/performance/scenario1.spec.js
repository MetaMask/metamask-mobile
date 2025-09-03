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
import AccountListComponent from '../../../wdio/screen-objects/AccountListComponent.js';
import AddAccountModal from '../../../wdio/screen-objects/Modals/AddAccountModal.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import { importSRPFlow, onboardingFlowImportSRP } from '../../utils/Flows.js';

test('Account creation with 50+ accounts, SRP 1 + SRP 2 + SRP 3', async ({
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

  await onboardingFlowImportSRP(device, process.env.TEST_SRP_1);
  await importSRPFlow(device, process.env.TEST_SRP_2);
  await importSRPFlow(device, process.env.TEST_SRP_3);

  const screen1Timer = new TimerHelper(
    'Time since the user clicks on "Account list" button until the account list is visible',
  );
  const screen2Timer = new TimerHelper(
    'Time since the user clicks on "Add account" button until the next modal is visible',
  );
  const screen3Timer = new TimerHelper(
    'Time since the user clicks on "Create Ethereum account" button until the Token list is visible',
  );

  await WalletMainScreen.isTokenVisible('Ethereum');
  screen1Timer.start();
  await WalletMainScreen.tapIdenticon();
  await AccountListComponent.isComponentDisplayed();
  screen1Timer.stop();
  screen2Timer.start();
  await AccountListComponent.tapAddAccountButton();
  screen2Timer.stop();
  screen3Timer.start();
  await AddAccountModal.tapCreateEthereumAccountButton();
  await AccountListComponent.isComponentDisplayed();
  screen3Timer.stop();

  performanceTracker.addTimer(screen1Timer);
  performanceTracker.addTimer(screen2Timer);
  performanceTracker.addTimer(screen3Timer);

  await performanceTracker.attachToTest(testInfo);
});
