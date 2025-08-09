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
test.beforeAll(async ({ device }) => {
  /*TermOfUseScreen.device = device;
  OnboardingScreen.device = device;
  CreateNewWalletScreen.device = device;
  MetaMetricsScreen.device = device;
  OnboardingSucessScreen.device = device;
  OnboardingSheet.device = device;
  SolanaFeatureSheet.device = device;
  WalletAccountModal.device = device;*/
});

test('User creates a new wallet during onboarding', async ({
  device,
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
  SolanaFeatureSheet.device = device;
  WalletAccountModal.device = device;
  SkipAccountSecurityModal.device = device;
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
    'Time until the user clicks on the "New wallet" button',
  );
  screen3Timer.start();
  await OnboardingScreen.isScreenTitleVisible();
  screen2Timer.stop();
  await OnboardingScreen.tapCreateNewWalletButton();
  await OnboardingSheet.tapImportSeedButton();
  const screen4Timer = new TimerHelper(
    'Time until the user completes the form and MetaMetrics screen is displayed',
  );
  screen4Timer.start();
  await CreateNewWalletScreen.isNewAccountScreenFieldsVisible();
  screen3Timer.stop();
  await CreateNewWalletScreen.inputPasswordInFirstField('123456789');
  await CreateNewWalletScreen.inputConfirmPasswordField('123456789');
  await CreateNewWalletScreen.tapSubmitButton();
  await CreateNewWalletScreen.tapRemindMeLater();
  await SkipAccountSecurityModal.proceedWithoutWalletSecure();
  const screen5Timer = new TimerHelper(
    'Time until the user clicks on the "I agree" button on MetaMetrics screen',
  );
  screen5Timer.start();
  await MetaMetricsScreen.isScreenTitleVisible();
  screen4Timer.stop();
  await MetaMetricsScreen.tapIAgreeButton();
  screen5Timer.stop();
  await OnboardingSucessScreen.tapDone();
  const screen6Timer = new TimerHelper(
    'Time until the user clicks on the "Not now" button on Solana feature sheet',
  );
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
