import AccountListComponent from '../../wdio/screen-objects/AccountListComponent.js';
import AddAccountModal from '../../wdio/screen-objects/Modals/AddAccountModal.js';
import ImportFromSeedScreen from '../../wdio/screen-objects/Onboarding/ImportFromSeedScreen.js';
import WalletMainScreen from '../../wdio/screen-objects/WalletMainScreen.js';
import TimerHelper from './TimersHelper.js';
import WelcomeScreen from '../../wdio/screen-objects/Onboarding/OnboardingCarousel.js';
import TermOfUseScreen from '../../wdio/screen-objects/Modals/TermOfUseScreen.js';
import OnboardingScreen from '../../wdio/screen-objects/Onboarding/OnboardingScreen.js';
import OnboardingSheet from '../../wdio/screen-objects/Onboarding/OnboardingSheet.js';
import CreatePasswordScreen from '../../wdio/screen-objects/Onboarding/CreatePasswordScreen.js';
import MetaMetricsScreen from '../../wdio/screen-objects/Onboarding/MetaMetricsScreen.js';
import OnboardingSucessScreen from '../../wdio/screen-objects/OnboardingSucessScreen.js';
import { getPasswordForScenario } from './TestConstants.js';
import LoginScreen from '../../wdio/screen-objects/LoginScreen.js';
import MultichainAccountEducationModal from '../../wdio/screen-objects/Modals/MultichainAccountEducationModal.js';
import PerpsGTMModal from '../../wdio/screen-objects/Modals/PerpsGTMModal.js';

export async function onboardingFlowImportSRP(device, srp) {
  WelcomeScreen.device = device;
  TermOfUseScreen.device = device;
  OnboardingScreen.device = device;
  OnboardingSheet.device = device;
  ImportFromSeedScreen.device = device;
  CreatePasswordScreen.device = device;
  MetaMetricsScreen.device = device;
  OnboardingSucessScreen.device = device;

  await OnboardingScreen.isScreenTitleVisible();

  await OnboardingScreen.tapHaveAnExistingWallet();
  await OnboardingSheet.isVisible();
  await OnboardingSheet.tapImportSeedButton();
  await ImportFromSeedScreen.isScreenTitleVisible();

  await ImportFromSeedScreen.typeSecretRecoveryPhrase(srp, true);
  await ImportFromSeedScreen.tapImportScreenTitleToDismissKeyboard();

  await ImportFromSeedScreen.tapContinueButton();

  await CreatePasswordScreen.isVisible();

  await CreatePasswordScreen.enterPassword(
    getPasswordForScenario('onboarding'),
  );
  await CreatePasswordScreen.reEnterPassword(
    getPasswordForScenario('onboarding'),
  );
  await CreatePasswordScreen.tapIUnderstandCheckBox();
  await CreatePasswordScreen.tapCreatePasswordButton();

  await MetaMetricsScreen.isScreenTitleVisible();
  await MetaMetricsScreen.tapIAgreeButton();

  await OnboardingSucessScreen.isVisible();
  await OnboardingSucessScreen.tapDone();

  await tapPerpsBottomSheetGotItButton(device);
  await dismissMultichainAccountsIntroModal(device);

  await WalletMainScreen.isMainWalletViewVisible();
}

export async function importSRPFlow(device, srp) {
  WalletMainScreen.device = device;
  AccountListComponent.device = device;
  AddAccountModal.device = device;
  ImportFromSeedScreen.device = device;
  const timers = [];
  const timer = new TimerHelper(
    'Time since the user clicks on "Account list" button until the account list is visible',
  );
  const timer2 = new TimerHelper(
    'Time since the user clicks on "Add account" button until the next modal is visible',
  );
  const timer3 = new TimerHelper(
    'Time since the user clicks on "Import SRP" button until SRP field is displayed',
  );
  const timer4 = new TimerHelper(
    'Time since the user clicks on "Continue" button on SRP screen until Wallet main screen is visible',
  );

  timer.start();

  await WalletMainScreen.tapIdenticon();
  await AccountListComponent.isComponentDisplayed();
  timer.stop();

  timer2.start();
  await AccountListComponent.tapCreateAccountButton();
  await AddAccountModal.isVisible();
  timer2.stop();

  timer3.start();
  await AddAccountModal.tapImportSrpButton();
  await ImportFromSeedScreen.isScreenTitleVisible(false);
  timer3.stop();
  await ImportFromSeedScreen.typeSecretRecoveryPhrase(srp, false);
  await ImportFromSeedScreen.tapImportScreenTitleToDismissKeyboard(false);

  timer4.start();
  await ImportFromSeedScreen.tapContinueButton(false);
  await WalletMainScreen.isMainWalletViewVisible();
  timer4.stop();

  timers.push(timer, timer2, timer3, timer4);
  return timers;
}

export async function login(device, options = {}) {
  LoginScreen.device = device;
  const { skipIntro = false, scenarioType = 'login' } = options;

  const password = getPasswordForScenario(scenarioType);

  // Type password and unlock
  await LoginScreen.typePassword(password);
  await LoginScreen.tapUnlockButton();
  // Wait for app to settle after unlock

  // Only tap intro screens on first login
  //if (!skipIntro) {
  // Run both modal dismissals in parallel with 5 second timeout
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Modal dismissal timeout')), 10000)
  );
  
  await Promise.race([
    Promise.allSettled([
      dismissMultichainAccountsIntroModal(device),
      tapPerpsBottomSheetGotItButton(device)
    ]),
    timeoutPromise
  ]).catch((error) => {
    console.log('Modal dismissal completed or timed out:', error.message);
  });
  //}
}
export async function tapPerpsBottomSheetGotItButton(device) {
  PerpsGTMModal.device = device;
  const container = await PerpsGTMModal.container;
  if (await container.isVisible({ timeout: 5000 })) {
    await PerpsGTMModal.tapNotNowButton();
    console.log('Perps onboarding dismissed');
  }
  if (await container.isVisible({ timeout: 5000 })) {
    await PerpsGTMModal.tapNotNowButton();
    console.log('Perps onboarding dismissed');
  }
}

export async function dismissMultichainAccountsIntroModal(
  device,
  timeout = 5000,
) {
  MultichainAccountEducationModal.device = device;
  const closeButton = await MultichainAccountEducationModal.closeButton;
  if (await closeButton.isVisible({ timeout })) {
    await MultichainAccountEducationModal.tapGotItButton();
  }
  if (await closeButton.isVisible({ timeout })) {
    await MultichainAccountEducationModal.tapGotItButton();
  }
}
