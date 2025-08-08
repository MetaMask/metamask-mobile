import { test, expect } from 'appwright';

import TimerHelper from '../utils/TimersHelper.js';
import { PerformanceTracker } from '../reporters/PerformanceTracker.js';
import WelcomeScreen from '../../wdio/screen-objects/Onboarding/OnboardingCarousel.js';
import TermOfUseScreen from '../../wdio/screen-objects/Modals/TermOfUseScreen.js';
import OnboardingScreen from '../../wdio/screen-objects/Onboarding/OnboardingScreen.js';
import CreateNewWalletScreen from '../../wdio/screen-objects/Onboarding/CreateNewWalletScreen.js';
import MetaMetricsScreen from '../../wdio/screen-objects/Onboarding/MetaMetricsScreen.js';
import OnboardingSucessScreen from '../../wdio/screen-objects/OnboardingSucessScreen.js';
import OnboardingSheet from '../../wdio/screen-objects/Onboarding/OnboardingSheet.js';
import SolanaFeatureSheet from '../../wdio/screen-objects/Modals/SolanaFeatureSheet.js';
import WalletAccountModal from '../../wdio/screen-objects/Modals/WalletAccountModal.js';
import SkipAccountSecurityModal from '../../wdio/screen-objects/Modals/SkipAccountSecurityModal.js';
import ImportFromSeedScreen from '../../wdio/screen-objects/Onboarding/ImportFromSeedScreen.js';
import CreatePasswordScreen from '../../wdio/screen-objects/Onboarding/CreatePasswordScreen.js';
import WalletMainScreen from '../../wdio/screen-objects/WalletMainScreen.js';
import AccountListComponent from '../../wdio/screen-objects/AccountListComponent.js';
import AddAccountModal from '../../wdio/screen-objects/Modals/AddAccountModal.js';
const SEEDLESS_ONBOARDING_ENABLED = process.env.SEEDLESS_ONBOARDING_ENABLED === 'true';

test('Import SRPs', async ({ device }, testInfo) => {
  const srp1Timer = new TimerHelper('Onboarding SRP 1 timer');
  const screen1Timer = new TimerHelper(
    'Time until the user clicks on the "Get Started" button',
  );
  screen1Timer.start();
  WelcomeScreen.device = device;
  TermOfUseScreen.device = device;
  OnboardingScreen.device = device;
  CreateNewWalletScreen.device = device;
  MetaMetricsScreen.device = device;
  OnboardingSucessScreen.device = device;
  OnboardingSheet.device = device;
  SolanaFeatureSheet.device = device;
  WalletAccountModal.device = device;
  SkipAccountSecurityModal.device = device;
  ImportFromSeedScreen.device = device;
  CreatePasswordScreen.device = device;
  WalletMainScreen.device = device;
  AccountListComponent.device = device;
  AddAccountModal.device = device;

  //await WelcomeScreen.waitForScreenToDisplay();
  srp1Timer.start();
  await WelcomeScreen.clickGetStartedButton();

  const screen2Timer = new TimerHelper(
    'Time until the user clicks on the "I agree" button',
  );
  screen2Timer.start();
  await TermOfUseScreen.isDisplayed();
  screen1Timer.stop();
  await TermOfUseScreen.tapAgreeCheckBox();
  await TermOfUseScreen.tapScrollEndButton();
  await TermOfUseScreen.tapAcceptButton();
  const screen3Timer = new TimerHelper(
    'Time until the user clicks on the "Import SRP" button',
  );
  screen3Timer.start();
  await OnboardingScreen.isScreenTitleVisible();
  screen2Timer.stop();
  await OnboardingScreen.tapHaveAnExistingWallet();
  if (SEEDLESS_ONBOARDING_ENABLED) {
    await OnboardingSheet.tapImportSeedButton();
  }
  const screen4Timer = new TimerHelper(
    'Time until the user import the SRP and password appears',
  );
  screen4Timer.start();
  await ImportFromSeedScreen.isScreenTitleVisible();
  screen3Timer.stop();
  await ImportFromSeedScreen.typeSecretRecoveryPhrase(
    process.env.TEST_SRP_1,
    true,
  );
  await ImportFromSeedScreen.tapImportScreenTitleToDismissKeyboard();
  await ImportFromSeedScreen.tapContinueButton();
  const screen5Timer = new TimerHelper(
    'Time until the user completes the password fields and MetaMetrics screen is displayed',
  );
  screen4Timer.stop();
  screen5Timer.start();
  await CreatePasswordScreen.enterPassword('123456789');
  await CreatePasswordScreen.reEnterPassword('123456789');
  await CreatePasswordScreen.tapIUnderstandCheckBox();
  await CreatePasswordScreen.tapCreatePasswordButton();
  await MetaMetricsScreen.isScreenTitleVisible();
  screen5Timer.stop();
  await MetaMetricsScreen.tapIAgreeButton();
  const screen6Timer = new TimerHelper(
    'Time until the user clicks on the "Done" button on Onboarding Success screen',
  );
  await OnboardingSucessScreen.tapDone();
  screen6Timer.start();
  await SolanaFeatureSheet.isVisible();
  await SolanaFeatureSheet.tapNotNowButton();
  screen6Timer.stop();
  await WalletMainScreen.isMainWalletViewVisible();
  srp1Timer.stop();
  const srp2Timer = new TimerHelper('Importing SRP 2 total timer');
  srp2Timer.start();
  await WalletMainScreen.tapIdenticon();
  await AccountListComponent.tapAddAccountButton();
  await AddAccountModal.tapImportSrpButton();
  await ImportFromSeedScreen.typeSecretRecoveryPhrase(
    process.env.TEST_SRP_2,
    false,
  );
  await ImportFromSeedScreen.tapImportScreenTitleToDismissKeyboard(false);

  const srp2StartImportTimer = new TimerHelper(
    'Time from the user clicks on "Continue" button on Import the second SRP until main wallet view is visible',
  );

  await ImportFromSeedScreen.tapContinueButton(false);
  srp2StartImportTimer.start();
  await WalletMainScreen.isMainWalletViewVisible();

  srp2StartImportTimer.stop();
  srp2Timer.stop();
  /////// Import SRP 3
  const srp3Timer = new TimerHelper('Importing SRP 3 total timer');
  srp3Timer.start();
  await WalletMainScreen.tapIdenticon();
  await AccountListComponent.tapAddAccountButton();
  await AddAccountModal.tapImportSrpButton();
  await ImportFromSeedScreen.typeSecretRecoveryPhrase(
    process.env.TEST_SRP_3,
    false,
  );
  await ImportFromSeedScreen.tapImportScreenTitleToDismissKeyboard(false);
  const srp3StartImportTimer = new TimerHelper(
    'Time from the user clicks on "Continue" button on Import the third SRP until main wallet view is visible',
  );

  await ImportFromSeedScreen.tapContinueButton(false);
  srp3StartImportTimer.start();
  await WalletMainScreen.isMainWalletViewVisible();

  srp3StartImportTimer.stop();
  srp3Timer.stop();
  const performanceTracker = new PerformanceTracker();
  performanceTracker.addTimer(screen1Timer);
  performanceTracker.addTimer(screen2Timer);
  performanceTracker.addTimer(screen3Timer);
  performanceTracker.addTimer(screen4Timer);
  performanceTracker.addTimer(screen5Timer);
  performanceTracker.addTimer(screen6Timer);
  performanceTracker.addTimer(srp1Timer);
  performanceTracker.addTimer(srp2StartImportTimer);
  performanceTracker.addTimer(srp2Timer);
  performanceTracker.addTimer(srp3StartImportTimer);
  performanceTracker.addTimer(srp3Timer);

  await performanceTracker.attachToTest(testInfo);
});
