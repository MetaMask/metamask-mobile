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
} from '../../../utils/flows/Flows.js';

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
  const timer3 = new TimerHelper(
    'Time since the user clicks on "Create new wallet" button until "Social sign up" is visible',
    { ios: 1200, android: 1200 },
    device,
  );
  const timer4 = new TimerHelper(
    'Time since the user clicks on "Import using SRP" button until SRP field is displayed',
    { ios: 1200, android: 1200 },
    device,
  );
  const timer5 = new TimerHelper(
    'Time since the user clicks on "Continue" button on SRP screen until Password fields are visible',
    { ios: 1000, android: 1000 },
    device,
  );
  const timer6 = new TimerHelper(
    'Time since the user clicks on "Create Password" button until Metrics screen is displayed',
    { ios: 1100, android: 1100 },
    device,
  );
  const timer7 = new TimerHelper(
    'Time since the user clicks on "I agree" button on Metrics screen until Onboarding Success screen is visible',
    { ios: 1500, android: 1500 },
    device,
  );
  const timer8 = new TimerHelper(
    'Time since the user clicks on "Done" button until feature sheet is visible',
    { ios: 1700, android: 1700 },
    device,
  );
  const timer9 = new TimerHelper(
    'Time since the user clicks on "Not now" button On feature sheet until native token is visible',
    { ios: 40000, android: 40000 },
    device,
  );

  await OnboardingScreen.tapHaveAnExistingWallet();
  await timer3.measure(() => OnboardingSheet.isVisible());

  await OnboardingSheet.tapImportSeedButton();
  await timer4.measure(() => ImportFromSeedScreen.isScreenTitleVisible());

  await ImportFromSeedScreen.typeSecretRecoveryPhrase(
    process.env.TEST_SRP_3,
    true,
  );
  await ImportFromSeedScreen.tapImportScreenTitleToDismissKeyboard();

  await ImportFromSeedScreen.tapContinueButton();
  await timer5.measure(() => CreatePasswordScreen.isVisible());

  await CreatePasswordScreen.enterPassword(getPasswordForScenario('import'));
  await CreatePasswordScreen.reEnterPassword(getPasswordForScenario('import'));
  await CreatePasswordScreen.tapIUnderstandCheckBox();
  await CreatePasswordScreen.tapCreatePasswordButton();

  await timer6.measure(() => MetaMetricsScreen.isScreenTitleVisible());

  await MetaMetricsScreen.tapIAgreeButton();
  await timer7.measure(() => OnboardingSucessScreen.isVisible());

  await OnboardingSucessScreen.tapDone();
  await timer8.measure(() => checkPredictionsModalIsVisible(device));

  await dissmissPredictionsModal(device);
  await timer9.measure(async () => {
    await WalletMainScreen.isTokenVisible('ETH');
    await WalletMainScreen.isTokenVisible('SOL');
  });

  performanceTracker.addTimers(
    timer3,
    timer4,
    timer5,
    timer6,
    timer7,
    timer8,
    timer9,
  );
  await performanceTracker.attachToTest(testInfo);
});
