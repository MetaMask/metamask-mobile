import { test } from 'appwright';

import TimerHelper from '../../utils/TimersHelper.js';
import { PerformanceTracker } from '../../reporters/PerformanceTracker.js';
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

test('Onboarding new wallet, SRP 1 + SRP 2 + SRP 3', async ({
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

  const timer1 = new TimerHelper(
    'Time since the user clicks on "Get Started" button until the Term of Use screen is visible',
  );
  const timer2 = new TimerHelper(
    'Time since the user clicks on "Aggree to T&C" button until the Onboarding screen is visible',
  );
  const timer3 = new TimerHelper(
    'Time since the user clicks on "Create new wallet" button until "continue with SRP" button is visible',
  );
  const timer4 = new TimerHelper(
    'Time since the user clicks on "Continue with SRP" button until password fields are visible',
  );
  const timer5 = new TimerHelper(
    'Time since the user clicks on "Create Password" button until "Remind me later" shows up',
  );
  const timer6 = new TimerHelper(
    'Time since the user clicks on "Proceed without wallet secure" button until Metrics screen is displayed',
  );
  const timer7 = new TimerHelper(
    'Time since the user clicks on "Aggree" button on Metrics screen until Onboarding Success screen is visible',
  );
  const timer8 = new TimerHelper(
    'Time since the user clicks on "Done" button until Solana feature sheet is visible',
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
  await OnboardingScreen.tapCreateNewWalletButton();
  await OnboardingSheet.isVisible();
  timer3.stop();
  timer4.start();
  await OnboardingSheet.tapImportSeedButton();
  await CreateNewWalletScreen.isNewAccountScreenFieldsVisible();
  timer4.stop();
  await CreateNewWalletScreen.inputPasswordInFirstField('123456789');
  await CreateNewWalletScreen.inputConfirmPasswordField('123456789');
  timer5.start();
  await CreateNewWalletScreen.tapSubmitButton();
  await CreateNewWalletScreen.tapRemindMeLater();
  await SkipAccountSecurityModal.isVisible();
  timer5.stop();
  timer6.start();
  await SkipAccountSecurityModal.proceedWithoutWalletSecure();
  await MetaMetricsScreen.isScreenTitleVisible();
  timer6.stop();
  timer7.start();
  await MetaMetricsScreen.tapIAgreeButton();
  await OnboardingSucessScreen.isVisible();
  timer7.stop();
  timer8.start();
  await OnboardingSucessScreen.tapDone();
  timer8.stop();

  performanceTracker.addTimer(timer1);
  performanceTracker.addTimer(timer2);
  performanceTracker.addTimer(timer3);
  performanceTracker.addTimer(timer4);
  performanceTracker.addTimer(timer5);
  performanceTracker.addTimer(timer6);
  performanceTracker.addTimer(timer7);
  performanceTracker.addTimer(timer8);
  await performanceTracker.attachToTest(testInfo);
});
