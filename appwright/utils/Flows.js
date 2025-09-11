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

/**
 * Safe element interaction that dismisses alerts before and after tapping
 * Use this instead of direct element.tap() calls for critical elements
 * @param {Object} element - The element to tap
 * @param {Object} device - The device object
 * @param {string} elementName - Name of element for logging
 */
export async function safeTap(element, device, elementName = 'element') {
  // Dismiss any alerts before tapping
  await dismissSystemDialogs(device);

  try {
    await element.tap();
    console.log(`Successfully tapped ${elementName}`);
  } catch (error) {
    console.log(
      `Failed to tap ${elementName}, trying alert dismissal and retry...`,
    );

    // Try dismissing alerts and retry once
    await dismissSystemDialogs(device);
    await device.waitForTimeout(1000);

    try {
      await element.tap();
      console.log(`Successfully tapped ${elementName} on retry`);
    } catch (retryError) {
      console.log(
        `Failed to tap ${elementName} even after retry: ${retryError.message}`,
      );
      throw retryError;
    }
  }

  // Dismiss any alerts that appeared after tapping
  await dismissSystemDialogs(device);
}

/**
 * Safe element interaction with visibility check
 * Ensures element is visible before attempting to tap
 * @param {Object} element - The element to tap
 * @param {Object} device - The device object
 * @param {string} elementName - Name of element for logging
 */
export async function safeTapWithVisibility(
  element,
  device,
  elementName = 'element',
) {
  // Dismiss any alerts first
  await dismissSystemDialogs(device);

  // Wait for element to be visible
  try {
    await element.isVisible({ timeout: 5000 });
  } catch (error) {
    console.log(
      `⚠️ ${elementName} not visible, dismissing alerts and retrying...`,
    );
    await dismissSystemDialogs(device);
    await element.isVisible({ timeout: 5000 });
  }

  // Now tap safely
  await safeTap(element, device, elementName);
}

/**
 * Handle delayed alerts that appear during test execution
 * Call this at critical points in your test flow
 * @param {Object} device - The device object
 * @param {number} maxAttempts - Maximum number of attempts to dismiss alerts
 */
export async function handleDelayedAlerts(device, maxAttempts = 3) {
  if (!AppwrightSelectors.isAndroid(device)) {
    return; // Only handle alerts on Android
  }

  console.log('🔍 Checking for delayed alerts...');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await AppwrightSelectors.dismissAlert(device);
      console.log(`✅ Dismissed delayed alert (attempt ${attempt})`);

      // Wait a bit to see if more alerts appear
      await device.waitForTimeout(1000);
    } catch (error) {
      if (
        error.message.includes('no such alert') ||
        error.message.includes('modal dialog when one was not open')
      ) {
        console.log(`ℹ️ No more alerts found (attempt ${attempt})`);
        break;
      } else {
        console.log(
          `⚠️ Alert dismissal failed on attempt ${attempt}: ${error.message}`,
        );
        if (attempt === maxAttempts) {
          throw error;
        }
      }
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
  await AccountListComponent.tapAddAccountButton();
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
  await tapPerpsBottomSheetGotItButton(device);
  // Wait for app to settle after unlock
  await dismissSystemDialogs(device);
}
export async function tapPerpsBottomSheetGotItButton(device) {
  // Only skip perps onboarding on Android devices
  if (!AppwrightSelectors.isAndroid(device)) {
    console.log('Skipping perps onboarding skip - not an Android device');
    return;
  }

  try {
    console.log('Looking for perps onboarding button...');
    const button = await AppwrightSelectors.getElementByID(
      device,
      PerpsGTMModalSelectorsIDs.PERPS_NOT_NOW_BUTTON,
    );

    // Use safe tap to handle any alerts that might interfere
    await safeTapWithVisibility(button, device, 'perps onboarding button');
    console.log('Perps onboarding dismissed');
  } catch (error) {
    console.log(
      `ℹPerps onboarding button not found or already dismissed: ${error.message}`,
    );
  }
}
