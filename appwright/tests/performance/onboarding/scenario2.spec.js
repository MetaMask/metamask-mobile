import { test } from '../../../fixtures/performance-test.js';

import TimerHelper from '../../../utils/TimersHelper.js';
import { getPasswordForScenario } from '../../../utils/TestConstants.js';
import OnboardingView from '../../../../e2e/pages/Onboarding/OnboardingView.js';
import OnboardingSheet from '../../../../e2e/pages/Onboarding/OnboardingSheet.js';
import CreatePasswordView from '../../../../e2e/pages/Onboarding/CreatePasswordView.js';
import ProtectYourWalletView from '../../../../e2e/pages/Onboarding/ProtectYourWalletView.js';
import SkipAccountSecurityModal from '../../../../e2e/pages/Onboarding/SkipAccountSecurityModal.js';
import MetaMetricsOptInView from '../../../../e2e/pages/Onboarding/MetaMetricsOptInView.js';
import OnboardingSuccessView from '../../../../e2e/pages/Onboarding/OnboardingSuccessView.js';
import WalletView from '../../../../e2e/pages/wallet/WalletView.js';

test('Onboarding new wallet, SRP 1 + SRP 2 + SRP 3', async ({
  device,
  performanceTracker,
}, testInfo) => {
  const screen1Timer = new TimerHelper(
    'Time until the user clicks on the "Get Started" button',
  );

  OnboardingView.device = device;
  OnboardingSheet.device = device;
  SkipAccountSecurityModal.device = device;
  CreatePasswordView.device = device;
  ProtectYourWalletView.device = device;
  MetaMetricsOptInView.device = device;
  OnboardingSuccessView.device = device;
  WalletView.device = device;

  const timer1 = new TimerHelper(
    'Time since the user clicks on "Create new wallet" button until "continue with SRP" button is visible',
  );
  const timer2 = new TimerHelper(
    'Time since the user clicks on "Continue with SRP" button until password fields are visible',
  );
  const timer3 = new TimerHelper(
    'Time since the user clicks on "Create Password" button until "Remind me later" shows up',
  );
  const timer4 = new TimerHelper(
    'Time since the user clicks on "Proceed without wallet secure" button until Metrics screen is displayed',
  );
  const timer5 = new TimerHelper(
    'Time since the user clicks on "Aggree" button on Metrics screen until Onboarding Success screen is visible',
  );
  const timer6 = new TimerHelper(
    'Time since the user clicks on "Done" button until Solana feature sheet is visible',
  );
  const timer7 = new TimerHelper(
    'Time since the user clicks on "Done" button until wallet view is visible',
  );

  timer1.start();
  await OnboardingView.tapCreateWallet();
  timer1.stop();
  timer2.start();
  await OnboardingSheet.tapImportSeedButton();
  await CreatePasswordView.isVisible();
  timer2.stop();
  await CreatePasswordView.enterPassword(getPasswordForScenario('onboarding'));
  await CreatePasswordView.reEnterPassword(
    getPasswordForScenario('onboarding'),
  );
  await CreatePasswordView.tapIUnderstandCheckBox();
  await CreatePasswordView.tapCreatePasswordButton();
  timer3.start();
  await ProtectYourWalletView.isVisible();
  timer3.stop();
  await ProtectYourWalletView.tapOnRemindMeLaterButton();
  timer4.start();
  await SkipAccountSecurityModal.isVisible();
  timer4.stop();
  await SkipAccountSecurityModal.tapIUnderstandCheckBox();
  await SkipAccountSecurityModal.tapSkipButton();
  timer5.start();
  await MetaMetricsOptInView.isScreenTitleVisible();
  timer5.stop();

  await MetaMetricsOptInView.tapAgreeButton();
  timer6.start();
  await OnboardingSuccessView.isVisible();
  timer6.stop();

  await OnboardingSuccessView.tapDone();
  timer7.start();

  await WalletView.isVisible();
  timer7.stop();

  performanceTracker.addTimer(timer1);
  performanceTracker.addTimer(timer2);
  performanceTracker.addTimer(timer3);
  performanceTracker.addTimer(timer4);
  performanceTracker.addTimer(timer5);
  performanceTracker.addTimer(timer6);
  performanceTracker.addTimer(timer7);
  await performanceTracker.attachToTest(testInfo);
});
