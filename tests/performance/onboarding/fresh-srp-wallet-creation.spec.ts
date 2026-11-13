import { test as perfTest } from '../../framework/fixtures/playwright';
import { AppiumAssertions, AppiumGestures } from '../../framework';
import TimerHelper from '../../framework/TimerHelper';
import { getPasswordForScenario } from '../../framework/utils/TestConstants.js';
import OnboardingView from '../../page-objects/Onboarding/OnboardingView';
import OnboardingSheet from '../../page-objects/Onboarding/OnboardingSheet';
import CreatePasswordView from '../../page-objects/Onboarding/CreatePasswordView';
import ProtectYourWalletView from '../../page-objects/Onboarding/ProtectYourWalletView';
import MetaMetricsOptInView from '../../page-objects/Onboarding/MetaMetricsOptInView';
import { enableHermesAppProfiling } from '../helpers/appProfiling';
import { measureFreshSrpPostOnboarding } from './helpers/freshSrpPostOnboarding';
import {
  Performance,
  PerformanceOnboarding,
  System,
} from '../../tags.performance.js';

/* TO-915: Fresh SRP wallet creation from onboarding to a usable wallet. */
perfTest.describe(`${Performance} ${System} ${PerformanceOnboarding}`, () => {
  perfTest(
    'Fresh SRP wallet creation performance',
    { tag: '@metamask-onboarding-team' },
    async ({ currentDeviceDetails, driver: appDriver, performanceTracker }) => {
      perfTest.setTimeout(10 * 60 * 1_000);

      // These are conservative initial guardrails to calibrate against CI
      // performance baselines once this coverage is running consistently.
      const onboardingSheetTimer = new TimerHelper(
        'Time since the user taps "Create a new wallet" until the onboarding sheet is visible',
        { ios: 1_500, android: 1_800 },
        currentDeviceDetails.platform,
      );
      const passwordScreenTimer = new TimerHelper(
        'Time since the user selects SRP wallet creation until the password fields are visible',
        { ios: 1_500, android: 2_000 },
        currentDeviceDetails.platform,
      );
      const walletCreationTimer = new TimerHelper(
        'Time since the user taps "Create Password" until the wallet backup screen is visible',
        { ios: 5_000, android: 7_000 },
        currentDeviceDetails.platform,
      );
      const backupSkipTimer = new TimerHelper(
        'Time since the user taps "Remind me later" until the MetaMetrics screen is visible',
        { ios: 2_000, android: 2_500 },
        currentDeviceDetails.platform,
      );

      await AppiumAssertions.expectElementToBeVisible(
        OnboardingView.newWalletButton,
        {
          timeout: 60_000,
          description: 'Fresh-install onboarding screen should be ready',
        },
      );

      await enableHermesAppProfiling();
      await OnboardingView.tapCreateNewWalletButton();
      await onboardingSheetTimer.measure(async () => {
        await AppiumAssertions.expectElementToBeVisible(
          OnboardingSheet.importSeedButton,
        );
      });

      // Note: `IMPORT_SEED_BUTTON` is the testID name, but the underlying
      // component (app/components/Views/OnboardingSheet/index.tsx) toggles
      // its behavior on the `createWallet` prop. Because we entered via
      // "Create a new wallet", tapping this button fires `onPressCreate` and
      // navigates to ChoosePassword — i.e. it starts a fresh SRP creation,
      // not an import. The Page Object method name mirrors the testID.
      await OnboardingSheet.tapImportSeedButton();
      await passwordScreenTimer.measure(async () => {
        await CreatePasswordView.isVisible();
      });

      const password = getPasswordForScenario('onboarding') ?? '';
      await CreatePasswordView.enterPassword(password);
      await CreatePasswordView.reEnterPassword(password);
      await AppiumGestures.hideKeyboard();

      await CreatePasswordView.tapCreatePasswordButton();
      await CreatePasswordView.tapPasswordWarningConfirmButton();
      await walletCreationTimer.measure(async () => {
        await AppiumAssertions.expectElementToBeVisible(
          ProtectYourWalletView.remindMeLaterButton,
          {
            timeout: 30_000,
            description: 'Wallet backup screen should be visible',
          },
        );
      });

      await ProtectYourWalletView.tapRemindMeLater();
      await backupSkipTimer.measure(async () => {
        await AppiumAssertions.expectElementToBeVisible(
          MetaMetricsOptInView.screenTitle,
          {
            timeout: 30_000,
            description: 'MetaMetrics screen should be visible',
          },
        );
      });

      performanceTracker.addTimers(
        onboardingSheetTimer,
        passwordScreenTimer,
        walletCreationTimer,
        backupSkipTimer,
      );

      // Post-onboarding sheets (questionnaire / push / Predict) are A/B and
      // optional for this perf scenario. Core measured steps end at MetaMetrics;
      // failure to land on wallet here must not fail the test.
      await measureFreshSrpPostOnboarding(
        performanceTracker,
        currentDeviceDetails.platform,
      );
    },
  );
});
