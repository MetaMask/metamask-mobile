import { test, expect } from 'appwright';

import TimerHelper from '../utils/TimersHelper';
import { PerformanceTracker } from '../reporters/PerformanceTracker';
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

test('Import SRPs', async ({ device }, testInfo) => {
  const coreUser = new TimerHelper('Core user onboarding timer');
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
  //await WelcomeScreen.waitForScreenToDisplay();
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
  await OnboardingSheet.tapImportSeedButton();
  const screen4Timer = new TimerHelper(
    'Time until the user import the SRP and password appears',
  );
  screen4Timer.start();
  await ImportFromSeedScreen.isScreenTitleVisible();
  screen3Timer.stop();
  await ImportFromSeedScreen.typeSecretRecoveryPhrase(process.env.TEST_SRP_1);
  await ImportFromSeedScreen.tapImportScreenTitleToDismissKeyboard();
  await ImportFromSeedScreen.tapContinueButton();
  const screen5Timer = new TimerHelper(
    'Time until the user completes the password fields and MetaMetrics screen is displayed',
  );
  screen5Timer.start();
  await CreatePasswordScreen.enterPassword('123456789');
  await CreatePasswordScreen.reEnterPassword('123456789');
  await CreatePasswordScreen.tapIUnderstandCheckBox();
  await CreatePasswordScreen.tapCreatePasswordButton();
  const metaMetricsScreenTimer = new TimerHelper('metaMetricsScreenTimer');
  metaMetricsScreenTimer.start();
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
  const performanceTracker = new PerformanceTracker();
  performanceTracker.addTimer(screen1Timer);
  performanceTracker.addTimer(screen2Timer);
  performanceTracker.addTimer(screen3Timer);
  performanceTracker.addTimer(screen4Timer);
  performanceTracker.addTimer(screen5Timer);
  performanceTracker.addTimer(screen6Timer);
  await performanceTracker.attachToTest(testInfo);
});
