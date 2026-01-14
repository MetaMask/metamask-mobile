import { test } from '../../../fixtures/performance-test.js';
import TimerHelper from '../../../utils/TimersHelper.js';
import WelcomeScreen from '../../../../wdio/screen-objects/Onboarding/OnboardingCarousel.js';
import TermOfUseScreen from '../../../../wdio/screen-objects/Modals/TermOfUseScreen.js';
import OnboardingScreen from '../../../../wdio/screen-objects/Onboarding/OnboardingScreen.js';
import CreateNewWalletScreen from '../../../../wdio/screen-objects/Onboarding/CreateNewWalletScreen.js';
import MetaMetricsScreen from '../../../../wdio/screen-objects/Onboarding/MetaMetricsScreen.js';
import OnboardingSucessScreen from '../../../../wdio/screen-objects/OnboardingSucessScreen.js';
import OnboardingSheet from '../../../../wdio/screen-objects/Onboarding/OnboardingSheet.js';
import WalletAccountModal from '../../../../wdio/screen-objects/Modals/WalletAccountModal.js';
import SkipAccountSecurityModal from '../../../../wdio/screen-objects/Modals/SkipAccountSecurityModal.js';
import WalletMainScreen from '../../../../wdio/screen-objects/WalletMainScreen.js';
import CreatePasswordScreen from '../../../../wdio/screen-objects/Onboarding/CreatePasswordScreen.js';
import ImportFromSeedScreen from '../../../../wdio/screen-objects/Onboarding/ImportFromSeedScreen.js';
import { getPasswordForScenario } from '../../../utils/TestConstants.js';

import {
  dissmissPredictionsModal,
  checkPredictionsModalIsVisible,
} from '../../../utils/Flows.js';

/* Scenario 4: Imported wallet with +50 accounts */
test.setTimeout(180000);
test('Onboarding Import SRP with +50 accounts, SRP 3', async ({
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
  WalletMainScreen.device = device;
  ImportFromSeedScreen.device = device;
  CreatePasswordScreen.device = device;
  const timer1 = new TimerHelper(
    'Time since the user clicks on "Create new wallet" button until "Social sign up" is visible',
    { ios: 1000, android: 1800 },
    device,
  );
  const timer2 = new TimerHelper(
    'Time since the user clicks on "Import using SRP" button until SRP field is displayed',
    { ios: 1000, android: 1500 },
    device,
  );
  const timer3 = new TimerHelper(
    'Time since the user clicks on "Continue" button on SRP screen until Password fields are visible',
    { ios: 2500, android: 1800 },
    device,
  );
  const timer4 = new TimerHelper(
    'Time since the user clicks on "Create Password" button until Metrics screen is displayed',
    { ios: 1000, android: 1600 },
    device,
  );
  const timer5 = new TimerHelper(
    'Time since the user clicks on "I agree" button on Metrics screen until Onboarding Success screen is visible',
    { ios: 2200, android: 1700 },
    device,
  );
  const timer6 = new TimerHelper(
    'Time since the user clicks on "Done" button until feature sheet is visible',
    { ios: 2500, android: 3100 },
    device,
  );
  const timer7 = new TimerHelper(
    'Time since the user clicks on "Not now" button On feature sheet until native token is visible',
    { ios: 35000, android: 40000 },
    device,
  );

  await OnboardingScreen.tapHaveAnExistingWallet();
  await timer1.measure(async () => await OnboardingSheet.isVisible());

  await OnboardingSheet.tapImportSeedButton();
  await timer2.measure(
    async () => await ImportFromSeedScreen.isScreenTitleVisible(),
  );

  await ImportFromSeedScreen.typeSecretRecoveryPhrase(
    process.env.TEST_SRP_3,
    true,
  );
  await ImportFromSeedScreen.tapImportScreenTitleToDismissKeyboard();

  await ImportFromSeedScreen.tapContinueButton();
  await timer3.measure(async () => await CreatePasswordScreen.isVisible());

  await CreatePasswordScreen.enterPassword(getPasswordForScenario('import'));
  await CreatePasswordScreen.reEnterPassword(getPasswordForScenario('import'));
  await CreatePasswordScreen.tapIUnderstandCheckBox();
  await CreatePasswordScreen.tapCreatePasswordButton();

  await timer4.measure(
    async () => await MetaMetricsScreen.isScreenTitleVisible(),
  );

  await MetaMetricsScreen.tapIAgreeButton();
  await timer5.measure(async () => await OnboardingSucessScreen.isVisible());

  await OnboardingSucessScreen.tapDone();
  await timer6.measure(
    async () => await checkPredictionsModalIsVisible(device),
  );

  await dissmissPredictionsModal(device);
  await timer7.measure(async () => {
    await WalletMainScreen.isTokenVisible('SOL');
  });

  performanceTracker.addTimers(
    timer1,
    timer2,
    timer3,
    timer4,
    timer5,
    timer6,
    timer7,
  );
  await performanceTracker.attachToTest(testInfo);
});
