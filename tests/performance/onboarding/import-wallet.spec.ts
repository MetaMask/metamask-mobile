import { test } from '../../framework/fixture';
import TimerHelper from '../../framework/TimerHelper';
import { getPasswordForScenario } from '../../framework/utils/TestConstants.js';
import { Performance, PerformanceOnboarding } from '../../tags.performance.js';
import OnboardingView from '../../page-objects/Onboarding/OnboardingView';
import {
  asPlaywrightElement,
  PlatformDetector,
  PlaywrightAssertions,
  PlaywrightGestures,
} from '../../framework';
import OnboardingSheet from '../../page-objects/Onboarding/OnboardingSheet';
import ImportWalletView from '../../page-objects/Onboarding/ImportWalletView';
import CreatePasswordView from '../../page-objects/Onboarding/CreatePasswordView';
import MetaMetricsOptInView from '../../page-objects/Onboarding/MetaMetricsOptInView';
import OnboardingSuccessView from '../../page-objects/Onboarding/OnboardingSuccessView';
import PredictModalView from '../../page-objects/Predict/PredictModalView';
import WalletView from '../../page-objects/wallet/WalletView';
import {
  dismissOnboardingInterestQuestionnaire,
  dismisspredictionsModalPlaywright,
  resolvePredictGtmOnboardingModalEnabled,
} from '../../flows/wallet.flow';
import { fetchProductionFeatureFlags } from '../feature-flag-helper';

const testEnvironment = 'test'; // hard coding this for now. We need a new FF env in LD for e2e. An admin needs to create it..

/* Scenario 4: Imported wallet with +50 accounts */
test.describe(PerformanceOnboarding, () => {
  test(
    'Onboarding Import SRP with +50 accounts, SRP 3',
    { tag: '@metamask-onboarding-team' },
    async ({ currentDeviceDetails, driver, performanceTracker }) => {
      const timer1 = new TimerHelper(
        'Time since the user clicks on "Create new wallet" button until "Social sign up" is visible',
        { ios: 1500, android: 1800 },
        currentDeviceDetails.platform,
      );
      const timer2 = new TimerHelper(
        'Time since the user clicks on "Import using SRP" button until SRP field is displayed',
        { ios: 2000, android: 1500 },
        currentDeviceDetails.platform,
      );
      const timer3 = new TimerHelper(
        'Time since the user clicks on "Continue" button on SRP screen until Password fields are visible',
        { ios: 1000, android: 1500 },
        currentDeviceDetails.platform,
      );
      const timer4 = new TimerHelper(
        'Time since the user clicks on "Create Password" button until Metrics screen is displayed',
        { ios: 2000, android: 1500 },
        currentDeviceDetails.platform,
      );
      const timer5 = new TimerHelper(
        'Time since the user clicks on "I agree" button on Metrics screen until Onboarding Success screen is visible',
        { ios: 2000, android: 1500 },
        currentDeviceDetails.platform,
      );
      const timer6 = new TimerHelper(
        'Time since the user clicks on "Done" button until feature sheet is visible',
        { ios: 3000, android: 3000 },
        currentDeviceDetails.platform,
      );
      const timer7 = new TimerHelper(
        'Time since the user clicks on "Done" button until ETH and BTC are visible',
        // +50 accounts on BrowserStack can take longer than local emulator.
        { ios: 21000, android: 5000 },
        currentDeviceDetails.platform,
      );
      const walletTokenLoadTimeoutMs = 60_000;

      const productionFeatureFlags = await fetchProductionFeatureFlags(
        'main',
        testEnvironment,
      );

      await OnboardingView.tapHaveAnExistingWallet();
      await timer1.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          await asPlaywrightElement(OnboardingSheet.importSeedButton),
        );
      });

      await OnboardingSheet.tapImportSeedButton();
      await timer2.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          await asPlaywrightElement(ImportWalletView.title),
        );
      });

      await ImportWalletView.typeSecretRecoveryPhrase(
        process.env.TEST_SRP_3 || '',
        true,
      );
      await PlaywrightGestures.hideKeyboard();

      await ImportWalletView.tapContinueButton();
      await timer3.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          await asPlaywrightElement(CreatePasswordView.newPasswordInput),
        );
      });

      await CreatePasswordView.enterPassword(
        getPasswordForScenario('import') || '',
      );
      await CreatePasswordView.reEnterPassword(
        getPasswordForScenario('import') || '',
      );

      await CreatePasswordView.tapPasswordVisibilityIcon();
      await CreatePasswordView.tapConfirmPasswordVisibilityIcon();
      await CreatePasswordView.tapIUnderstandCheckBox();
      if (await PlatformDetector.isAndroid()) {
        await PlaywrightGestures.hideKeyboard();
      }
      await CreatePasswordView.tapCreatePasswordButton();

      await timer4.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          await asPlaywrightElement(MetaMetricsOptInView.screenTitle),
        );
      });

      await MetaMetricsOptInView.tapIAgreeButton();
      await dismissOnboardingInterestQuestionnaire();
      await timer5.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          await asPlaywrightElement(OnboardingSuccessView.doneButton),
          { timeout: 30_000 },
        );
      });
      await OnboardingSuccessView.tapDone();

      const predictGtmOnboardingModalEnabled =
        await resolvePredictGtmOnboardingModalEnabled(productionFeatureFlags);

      if (predictGtmOnboardingModalEnabled) {
        await timer6.measure(async () => {
          await PlaywrightAssertions.expectElementToBeVisible(
            await asPlaywrightElement(PredictModalView.notNowButton),
          );
        });
      }

      await dismisspredictionsModalPlaywright();
      await timer7.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          await asPlaywrightElement(WalletView.tokensSection),
          { timeout: walletTokenLoadTimeoutMs },
        );
      });

      performanceTracker.addTimers(
        timer1,
        timer2,
        timer3,
        timer4,
        timer5,
        timer7,
      );
      if (
        predictGtmOnboardingModalEnabled &&
        predictGtmOnboardingModalEnabled === true
      ) {
        performanceTracker.addTimer(timer6);
      }
    },
  );
});
