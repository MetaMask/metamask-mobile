import { test as perfTest } from '../../framework/fixtures/playwright';
import { AppiumAssertions } from '../../framework';
import TimerHelper from '../../framework/TimerHelper';
import { getPasswordForScenario } from '../../framework/utils/TestConstants.js';
import OnboardingView from '../../page-objects/Onboarding/OnboardingView';
import { createFreshSrpWallet } from './helpers/createFreshSrpWallet';
import { measureFreshSrpPostOnboarding } from './helpers/freshSrpPostOnboarding';
import { enableHermesAppProfiling } from '../helpers/appProfiling';
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
        // Measured 0.8–1.0s.
        { ios: 1_200, android: 2_000 },
        currentDeviceDetails.platform,
      );
      const passwordScreenTimer = new TimerHelper(
        'Time since the user selects SRP wallet creation until the password fields are visible',
        // Measured 0.4–0.6s.
        { ios: 1_000, android: 2_000 },
        currentDeviceDetails.platform,
      );
      const walletCreationTimer = new TimerHelper(
        'Time since the user taps "Create Password" until the wallet backup screen is visible',
        // Measured 1.6–1.8s.
        { ios: 2_500, android: 3_000 },
        currentDeviceDetails.platform,
      );
      const backupSkipTimer = new TimerHelper(
        'Time since the user taps "Remind me later" until the MetaMetrics screen is visible',
        // Measured 0.4–0.8s.
        { ios: 1_200, android: 2_500 },
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
      await createFreshSrpWallet(getPasswordForScenario('onboarding') ?? '', {
        onboardingSheet: onboardingSheetTimer,
        passwordScreen: passwordScreenTimer,
        walletCreation: walletCreationTimer,
        backupSkip: backupSkipTimer,
      });

      performanceTracker.addTimers(
        onboardingSheetTimer,
        passwordScreenTimer,
        walletCreationTimer,
        backupSkipTimer,
      );

      await measureFreshSrpPostOnboarding(
        performanceTracker,
        currentDeviceDetails.platform,
      );
    },
  );
});
