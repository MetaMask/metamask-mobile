import { AppiumAssertions, AppiumGestures } from '../../../framework';
import TimerHelper from '../../../framework/TimerHelper';
import OnboardingView from '../../../page-objects/Onboarding/OnboardingView';
import OnboardingSheet from '../../../page-objects/Onboarding/OnboardingSheet';
import CreatePasswordView from '../../../page-objects/Onboarding/CreatePasswordView';
import ProtectYourWalletView from '../../../page-objects/Onboarding/ProtectYourWalletView';
import MetaMetricsOptInView from '../../../page-objects/Onboarding/MetaMetricsOptInView';

/** Optional timers for the fresh SRP creation steps. Omitted steps are not measured. */
export interface FreshSrpWalletCreationTimers {
  onboardingSheet?: TimerHelper;
  passwordScreen?: TimerHelper;
  walletCreation?: TimerHelper;
  backupSkip?: TimerHelper;
}

const runStep = async (
  timer: TimerHelper | undefined,
  action: () => Promise<void>,
): Promise<void> => {
  if (timer) {
    await timer.measure(action);
    return;
  }
  await action();
};

/**
 * Creates a fresh SRP wallet from the onboarding screen through the
 * MetaMetrics screen. Starts on the fresh-install screen, after "Create a
 * new wallet" is already visible.
 *
 * `IMPORT_SEED_BUTTON` is the testID name, but the onboarding sheet toggles
 * its behavior on the `createWallet` prop. Entering via "Create a new wallet"
 * makes that tap fire `onPressCreate` and open Choose Password.
 *
 * @param password - Wallet password. Callers decide what to do when it is missing.
 * @param timers - Pass a timer to measure that step. Omit it to run the step untimed.
 */
export const createFreshSrpWallet = async (
  password: string,
  timers: FreshSrpWalletCreationTimers = {},
): Promise<void> => {
  await OnboardingView.tapCreateNewWalletButton();
  await runStep(timers.onboardingSheet, async () => {
    await AppiumAssertions.expectElementToBeVisible(
      OnboardingSheet.importSeedButton,
    );
  });

  await OnboardingSheet.tapImportSeedButton();
  await runStep(timers.passwordScreen, async () => {
    await CreatePasswordView.isVisible();
  });

  await CreatePasswordView.enterPassword(password);
  await CreatePasswordView.reEnterPassword(password);
  await AppiumGestures.hideKeyboard();

  await CreatePasswordView.tapCreatePasswordButton();
  await CreatePasswordView.tapPasswordWarningConfirmButton();
  await runStep(timers.walletCreation, async () => {
    await AppiumAssertions.expectElementToBeVisible(
      ProtectYourWalletView.remindMeLaterButton,
      {
        timeout: 30_000,
        description: 'Wallet backup screen should be visible',
      },
    );
  });

  await ProtectYourWalletView.tapRemindMeLater();
  await runStep(timers.backupSkip, async () => {
    await AppiumAssertions.expectElementToBeVisible(
      MetaMetricsOptInView.screenTitle,
      {
        timeout: 30_000,
        description: 'MetaMetrics screen should be visible',
      },
    );
  });
};
