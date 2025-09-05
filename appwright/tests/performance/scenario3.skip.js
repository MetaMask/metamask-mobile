import { test, expect } from '../../fixtures/performance-test.js';
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
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import CreatePasswordScreen from '../../../wdio/screen-objects/Onboarding/CreatePasswordScreen.js';
import ImportFromSeedScreen from '../../../wdio/screen-objects/Onboarding/ImportFromSeedScreen.js';
import { getPasswordForScenario } from '../../utils/TestConstants.js';

test('Onboarding Import SRP with +50 accounts, SRP 3', async ({
  device,
  performanceTracker,
}, testInfo) => {
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
  WalletAccountModal.device = device;
  SkipAccountSecurityModal.device = device;
  WalletMainScreen.device = device;
  ImportFromSeedScreen.device = device;
  CreatePasswordScreen.device = device;

  const timer1 = new TimerHelper(
    'Time since the user clicks on "Get Started" button until the Term of Use screen is visible',
  );
  const timer2 = new TimerHelper(
    'Time since the user clicks on "Aggree to T&C" button until the Onboarding screen is visible',
  );
  const timer3 = new TimerHelper(
    'Time since the user clicks on "Create new wallet" button until "Social sign up" is visible',
  );
  const timer4 = new TimerHelper(
    'Time since the user clicks on "Import using SRP" button until SRP field is displayed',
  );
  const timer5 = new TimerHelper(
    'Time since the user clicks on "Continue" button on SRP screen until Password fields are visible',
  );
  const timer6 = new TimerHelper(
    'Time since the user clicks on "Create Password" button until Metrics screen is displayed',
  );
  const timer7 = new TimerHelper(
    'Time since the user clicks on "I agree" button on Metrics screen until Onboarding Success screen is visible',
  );
  const timer8 = new TimerHelper(
    'Time since the user clicks on "Done" button until Solana feature sheet is visible',
  );
  const timer9 = new TimerHelper(
    'Time since the user clicks on "Not now" button On Solana feature sheet until native token is visible',
  );
  const timer10 = new TimerHelper(
    'Time since the user clicks on "Account list" button until the account list is visible',
  );

  timer1.start();
  await WelcomeScreen.clickGetStartedButton();
  await TermOfUseScreen.isDisplayed();
  timer1.stop();
  await TermOfUseScreen.tapAgreeCheckBox();
  await TermOfUseScreen.tapScrollEndButton();

  timer2.start();
  await TermOfUseScreen.tapAcceptButton();
  await OnboardingScreen.isScreenTitleVisible();
  timer2.stop();

  timer3.start();
  await OnboardingScreen.tapHaveAnExistingWallet();
  await OnboardingSheet.isVisible();
  timer3.stop();

  timer4.start();
  await OnboardingSheet.tapImportSeedButton();
  await ImportFromSeedScreen.isScreenTitleVisible();
  timer4.stop();
  await ImportFromSeedScreen.typeSecretRecoveryPhrase(
    process.env.TEST_SRP_3,
    true,
  );
  await ImportFromSeedScreen.tapImportScreenTitleToDismissKeyboard();

  timer5.start();
  await ImportFromSeedScreen.tapContinueButton();

  await CreatePasswordScreen.isVisible();
  timer5.stop();
  await CreatePasswordScreen.enterPassword(getPasswordForScenario('import'));
  await CreatePasswordScreen.reEnterPassword(getPasswordForScenario('import'));
  await CreatePasswordScreen.tapIUnderstandCheckBox();
  await CreatePasswordScreen.tapCreatePasswordButton();

  timer6.start();
  await MetaMetricsScreen.isScreenTitleVisible();
  timer6.stop();

  timer7.start();
  await MetaMetricsScreen.tapIAgreeButton();
  await OnboardingSucessScreen.isVisible();
  timer7.stop();

  timer8.start();
  await OnboardingSucessScreen.tapDone();
  timer8.stop();
  timer9.start();
  await WalletMainScreen.isTokenVisible('Ethereum');
  timer9.stop();

  timer10.start();
  await WalletMainScreen.tapIdenticon();
  timer10.stop();
  performanceTracker.addTimer(timer1);
  performanceTracker.addTimer(timer2);
  performanceTracker.addTimer(timer3);
  performanceTracker.addTimer(timer4);
  performanceTracker.addTimer(timer5);
  performanceTracker.addTimer(timer6);
  performanceTracker.addTimer(timer7);
  performanceTracker.addTimer(timer8);
  performanceTracker.addTimer(timer9);
  await performanceTracker.attachToTest(testInfo);
});
