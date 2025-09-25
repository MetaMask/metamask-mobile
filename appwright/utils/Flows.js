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
import AppwrightSelectors from '../../wdio/helpers/AppwrightSelectors.js';
import { PerpsGTMModalSelectorsIDs } from '../../e2e/selectors/Perps/Perps.selectors.js';
import { MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS } from '../../app/components/Views/MultichainAccounts/IntroModal/testIds.js';

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
  if (!skipIntro) {
    await dismissMultichainAccountsIntroModal(device);
    await tapPerpsBottomSheetGotItButton(device);
  }
}
export async function tapPerpsBottomSheetGotItButton(device) {
  console.log('Looking for perps onboarding button...');
  const button = await AppwrightSelectors.getElementByID(
    device,
    PerpsGTMModalSelectorsIDs.PERPS_NOT_NOW_BUTTON,
  );
  await button.tap();
  console.log('Perps onboarding dismissed');
}

export async function dismissMultichainAccountsIntroModal(
  device,
  timeout = 5000,
) {
  const closeButton = await AppwrightSelectors.getElementByID(
    device,
    MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.CLOSE_BUTTON,
  );
  if (await closeButton.isVisible({ timeout })) {
    await closeButton.tap();
  }
}
