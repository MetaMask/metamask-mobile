import { test } from '../../framework/fixtures/playwright';
import TimerHelper from '../../framework/TimerHelper';
import { getPasswordForScenario } from '../../framework/utils/TestConstants.js';
import {
  Performance,
  System,
  PerformanceOnboarding,
  PerformanceAccountList,
} from '../../tags.performance.js';
import OnboardingView from '../../page-objects/Onboarding/OnboardingView.js';
import { AppiumAssertions, AppiumGestures } from '../../framework/index.js';
import OnboardingSheet from '../../page-objects/Onboarding/OnboardingSheet.js';
import CreatePasswordView from '../../page-objects/Onboarding/CreatePasswordView.js';
import ProtectYourWalletView from '../../page-objects/Onboarding/ProtectYourWalletView.js';
import ProtectYourWalletModal from '../../page-objects/Onboarding/ProtectYourWalletModal.js';
import SkipAccountSecurityModal from '../../page-objects/Onboarding/SkipAccountSecurityModal.js';
import MetaMetricsOptInView from '../../page-objects/Onboarding/MetaMetricsOptInView.js';
import {
  closePredictModal,
  dismissOnboardingInterestQuestionnaire,
  dismissPushNotificationExistingUserSheet,
} from '../../flows/wallet.flow.js';
import { withImplicitWait } from '../../framework/AppiumUtilities.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';

const dismissProtectWalletModalIfPresent = async (
  timeoutMs = 1_000,
): Promise<void> => {
  let backupAlertVisible = false;
  try {
    backupAlertVisible = await withImplicitWait(0, async () => {
      const backupAlert = await ProtectYourWalletModal.collapseWalletModal;
      await backupAlert.unwrap().waitForDisplayed({ timeout: timeoutMs });
      return true;
    });
  } catch {
    return;
  }

  if (!backupAlertVisible) {
    return;
  }

  await ProtectYourWalletModal.tapRemindMeLaterButton();

  let skipAccountSecurityVisible = false;
  try {
    skipAccountSecurityVisible = await withImplicitWait(0, async () => {
      const skipAccountSecurity = await SkipAccountSecurityModal.container;
      await skipAccountSecurity.unwrap().waitForDisplayed({
        timeout: timeoutMs,
      });
      return true;
    });
  } catch {
    return;
  }

  if (skipAccountSecurityVisible) {
    await SkipAccountSecurityModal.proceedWithoutWalletSecure();
  }
};

/* Scenario 2: Account creation after fresh install */
test.describe(`${Performance} ${System} ${PerformanceOnboarding} ${PerformanceAccountList}`, () => {
  test(
    'Account creation after fresh install',
    { tag: '@metamask-onboarding-team' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      await OnboardingView.tapCreateNewWalletButton();
      await AppiumAssertions.expectElementToBeVisible(
        OnboardingSheet.importSeedButton,
      );
      test.setTimeout(10 * 60 * 1000);
      await OnboardingSheet.tapImportSeedButton();
      await AppiumAssertions.expectElementToBeVisible(
        CreatePasswordView.newPasswordInput,
      );
      await CreatePasswordView.enterPassword(
        getPasswordForScenario('onboarding') ?? '',
      );
      await CreatePasswordView.reEnterPassword(
        getPasswordForScenario('onboarding') ?? '',
      );
      await AppiumGestures.hideKeyboard();

      await CreatePasswordView.tapIUnderstandCheckBox();
      await CreatePasswordView.tapCreatePasswordButton();
      await ProtectYourWalletView.tapRemindMeLater();
      await AppiumAssertions.expectElementToBeVisible(
        MetaMetricsOptInView.screenTitle,
      );
      await MetaMetricsOptInView.tapAgreeButton();
      await dismissOnboardingInterestQuestionnaire();
      await dismissPushNotificationExistingUserSheet();
      await closePredictModal();
      await dismissProtectWalletModalIfPresent();

      const screen1Timer = new TimerHelper(
        'Time since the user clicks on "Account list" button until the account list is visible',
        { ios: 2000, android: 2200 },
        currentDeviceDetails.platform,
      );
      const screen2Timer = new TimerHelper(
        'Time since the user clicks on "Create account" button until the account is in the account list',
        { ios: 1800, android: 2000 },
        currentDeviceDetails.platform,
      );
      const screen3Timer = new TimerHelper(
        'Time since the user clicks on new account created until the Token list is visible',
        { ios: 2000, android: 3000 },
        currentDeviceDetails.platform,
      );

      await AppiumAssertions.expectElementToBeVisible(
        TabBarComponent.tabBarWalletButton,
        {
          description:
            'token list should be visible after selecting the new account',
        },
      );

      await WalletView.tapIdenticon();
      await screen1Timer.measure(
        async () =>
          await AppiumAssertions.expectElementToBeVisible(
            AccountListBottomSheet.addWalletButton,
          ),
      );

      await AccountListBottomSheet.tapCreateAccount(0);
      await dismissProtectWalletModalIfPresent(1_500);
      await screen2Timer.measure(
        async () =>
          await AppiumAssertions.expectElementToBeVisible(
            AccountListBottomSheet.accountNameInList('Account 2'),
          ),
      );

      await AccountListBottomSheet.tapAccountByName('Account 2');
      await screen3Timer.measure(async () => {
        await AppiumAssertions.expectElementToBeVisible(WalletView.headerRoot, {
          description:
            'token list should be visible after selecting the new account',
        });
      });

      performanceTracker.addTimers(screen1Timer, screen2Timer, screen3Timer);
    },
  );
});
