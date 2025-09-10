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
  await device.waitForTimeout(3000);

  try {
    // Wait 3 seconds for dialog to appear

    // Try common permission dialog selectors using AppwrightSelectors
    const dialogSelectors = ['Allow', 'OK', 'Allow Notifications'];

    for (const selector of dialogSelectors) {
      try {
        const allowButton = await AppwrightSelectors.getElementByCatchAll(
          device,
          selector,
        );
        if (allowButton) {
          await device.tap(allowButton);
          console.log(`Tapped permission dialog button: ${selector}`);
          return;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    console.log(
      'No permission dialog found - autoAcceptAlerts may have handled it',
    );
  } catch (error) {
    console.debug('Error handling permission dialog:', error.message);
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
  await WelcomeScreen.clickGetStartedButton();
  await TermOfUseScreen.isDisplayed();

  await TermOfUseScreen.tapAgreeCheckBox();
  await TermOfUseScreen.tapScrollEndButton();

  await TermOfUseScreen.tapAcceptButton();
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
  await LoginScreen.typePassword('qwertyui');
  await LoginScreen.tapUnlockButton();
  await tapPerpsBottomSheetGotItButton(device);
  // Wait for app to settle after unlock
  await dismissSystemDialogs(device);
}
export async function tapPerpsBottomSheetGotItButton(device) {
  console.log('No perps onboarding!');
  // const button = await AppwrightSelectors.getElementByID(
  //   device,
  //   PerpsGTMModalSelectorsIDs.PERPS_NOT_NOW_BUTTON,
  // );
  // await button.tap();
}
