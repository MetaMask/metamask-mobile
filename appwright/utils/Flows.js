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

/**
 * Generic function to dismiss system dialogs (iOS permission dialogs, etc.)
 * @param {Object} device - The device object from Appwright
 */
export async function dismissSystemDialogs(device) {
  if (!AppwrightSelectors.isAndroid(device)) {
    console.log('system alerts are accepted as expected on android');
    return;
  }
  try {
    await AppwrightSelectors.dismissAlert(device);
  } catch (error) {
    // Ignore "no such alert" errors - this is normal when no dialogs are present
    if (
      !error.message.includes('no such alert') &&
      !error.message.includes('modal dialog when one was not open')
    ) {
      console.log(`Alert dismissal error: ${error.message}`);
    }
  }
}

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
  //Dismiss any GTM modal
  const notNowButton = await AppwrightSelectors.getElementByText(
    device,
    'Not now',
  );
  if (await notNowButton.isVisible({ timeout: 2000 })) {
    await notNowButton.tap();
  }
  await WalletMainScreen.isMainWalletViewVisible();

  await dismissSystemDialogs(device);
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

export async function login(device, scenarioType) {
  LoginScreen.device = device;

  const password = getPasswordForScenario(scenarioType);

  // Type password and unlock
  await LoginScreen.typePassword(password);
  await LoginScreen.tapUnlockButton();
  // await tapPerpsBottomSheetGotItButton(device);
  await dismissGTMModal(device);
  // Wait for app to settle after unlock
  await dismissSystemDialogs(device);
}

export async function dismissGTMModal(device) {
  const notNowButton = await AppwrightSelectors.getElementByText(
    device,
    'Not now',
  );
  if (await notNowButton.isVisible({ timeout: 2000 })) {
    await notNowButton.tap();
  }
}

export async function tapPerpsBottomSheetGotItButton(device) {
  // Only skip perps onboarding on Android devices
  if (!AppwrightSelectors.isAndroid(device)) {
    console.log('Skipping perps onboarding skip - not an Android device');
    return; // this behavior is a bit strange, using builds from main i do not see perps on android, but on other branches i do on iOS
  }

  console.log('Looking for perps onboarding button...');
  const button = await AppwrightSelectors.getElementByID(
    device,
    PerpsGTMModalSelectorsIDs.PERPS_NOT_NOW_BUTTON,
  );
  await button.tap();
  console.log('Perps onboarding dismissed');
}
