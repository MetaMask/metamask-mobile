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
import RewardsGTMModal from '../../wdio/screen-objects/Modals/RewardsGTMModal.js';
import AppwrightGestures from '../../tests/framework/AppwrightGestures.js';
import AppwrightSelectors from '../../tests/framework/AppwrightSelectors.js';
import { expect } from 'appwright';

export async function selectAccountDevice(device, testInfo) {
  // Access device name from testInfo.project.use.device
  const deviceName = testInfo.project.use.device.name;
  console.log(`📱 Device executing the test: ${deviceName}`);

  let accountName;

  // Define account mapping based on device name
  // The device names must match those in appwright.config.ts or device-matrix.json
  switch (deviceName) {
    case 'Samsung Galaxy S23 Ultra':
      accountName = 'Account 3';
      break;
    case 'Google Pixel 8 Pro':
      console.log(
        `🔄 Account 1 is selected by default in the app for device: ${deviceName}`,
      );
      return;
    case 'iPhone 16 Pro Max':
      accountName = 'Account 4';
      break;
    case 'iPhone 12':
      accountName = 'Account 5';
      break;
    default:
      console.log(
        `🔄 Account 1 is selected by default in the app for device: ${deviceName}`,
      );
      return;
  }
  // Account 2 is called stable and not used in this function

  console.log(
    `🔄 Switching to account: ${accountName} for device: ${deviceName}`,
  );

  // Set device for screen objects
  WalletMainScreen.device = device;
  AccountListComponent.device = device;

  // Perform account switch
  await WalletMainScreen.tapIdenticon();
  await AccountListComponent.isComponentDisplayed();
  await AccountListComponent.tapOnAccountByName(accountName);

  // Verify we are back on main screen (tapping account usually closes modal)
  await WalletMainScreen.isMainWalletViewVisible();
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

  //await dismissRewardsBottomSheetModal(device);
  await dissmissPredictionsModal(device);
  await WalletMainScreen.isMainWalletViewVisible();
}

export async function dissmissAllModals(device) {
  await dismissMultichainAccountsIntroModal(device);
  await dissmissPredictionsModal(device);
}

export async function dissmissPredictionsModal(device) {
  const notNowPredictionsModalButton = await AppwrightSelectors.getElementByID(
    device,
    'predict-gtm-not-now-button',
  );
  if (await notNowPredictionsModalButton.isVisible({ timeout: 10000 })) {
    await AppwrightGestures.tap(notNowPredictionsModalButton);
  }
}

export async function checkPredictionsModalIsVisible(device) {
  const notNowPredictionsModalButton = await AppwrightSelectors.getElementByID(
    device,
    'predict-gtm-not-now-button',
  );
  await expect(notNowPredictionsModalButton).toBeVisible({ timeout: 10000 });
}

export async function importSRPFlow(device, srp, dismissModals = false) {
  WalletMainScreen.device = device;
  AccountListComponent.device = device;
  AddAccountModal.device = device;
  ImportFromSeedScreen.device = device;
  const timers = [];
  const timer = new TimerHelper(
    'Time since the user clicks on "Account list" button until the account list is visible',
    { ios: 2500, android: 3000 },
    device,
  );
  const timer2 = new TimerHelper(
    'Time since the user clicks on "Add account" button until the next modal is visible',
    { ios: 1000, android: 1700 },
    device,
  );
  const timer3 = new TimerHelper(
    'Time since the user clicks on "Import SRP" button until SRP field is displayed',
    { ios: 1700, android: 1700 },
    device,
  );
  const timer4 = new TimerHelper(
    'Time since the user clicks on "Continue" button on SRP screen until Wallet main screen is visible',
    { ios: 5000, android: 2000 },
    device,
  );

  await WalletMainScreen.tapIdenticon();
  timer.start();
  await AccountListComponent.isComponentDisplayed();
  timer.stop();
  await AccountListComponent.waitForSyncingToComplete();
  await AccountListComponent.tapOnAddWalletButton();
  timer2.start();
  await AddAccountModal.isVisible();
  timer2.stop();

  await AddAccountModal.tapImportSrpButton();
  timer3.start();
  await ImportFromSeedScreen.isScreenTitleVisible(false);
  timer3.stop();
  await ImportFromSeedScreen.typeSecretRecoveryPhrase(srp, false);
  await ImportFromSeedScreen.tapImportScreenTitleToDismissKeyboard(false);

  await ImportFromSeedScreen.tapContinueButton(false);
  dismissModals ? await dissmissAllModals(device) : null;
  timer4.start();
  await WalletMainScreen.isMainWalletViewVisible();
  timer4.stop();

  timers.push(timer, timer2, timer3, timer4);
  return timers;
}

export async function login(device, options = {}) {
  LoginScreen.device = device;
  const { scenarioType = 'login', dismissModals = false } = options;

  const password = getPasswordForScenario(scenarioType);
  // Type password and unlock
  await LoginScreen.typePassword(password);
  await LoginScreen.tapUnlockButton();
  if (dismissModals) {
    await dismissMultichainAccountsIntroModal(device);
    await dissmissPredictionsModal(device);
  }
}

export async function tapPerpsBottomSheetGotItButton(device) {
  PerpsGTMModal.device = device;
  const container = await PerpsGTMModal.container;
  if (await container.isVisible({ timeout: 5000 })) {
    await PerpsGTMModal.tapNotNowButton();
    console.log('Perps onboarding dismissed');
  }
}

export async function dismissRewardsBottomSheetModal(device) {
  RewardsGTMModal.device = device;
  const container = await RewardsGTMModal.notNowButton;
  if (await container.isVisible({ timeout: 5000 })) {
    await RewardsGTMModal.tapNotNowButton();
  }
}

export async function dismissMultichainAccountsIntroModal(
  device,
  timeout = 10000,
) {
  MultichainAccountEducationModal.device = device;
  const closeButton = await MultichainAccountEducationModal.closeButton;
  if (await closeButton.isVisible({ timeout })) {
    await MultichainAccountEducationModal.tapGotItButton();
  }
}
