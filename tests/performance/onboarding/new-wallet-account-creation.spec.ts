import { test } from '../../framework/fixture';
import TimerHelper from '../../framework/TimerHelper';
import { getPasswordForScenario } from '../../framework/utils/TestConstants.js';
import {
  PerformanceOnboarding,
  PerformanceAccountList,
} from '../../tags.performance.js';
import OnboardingView from '../../page-objects/Onboarding/OnboardingView.js';
import {
  asPlaywrightElement,
  PlaywrightAssertions,
  PlaywrightGestures,
  withSnapshotSettings,
} from '../../framework/index.js';
import OnboardingSheet from '../../page-objects/Onboarding/OnboardingSheet.js';
import CreatePasswordView from '../../page-objects/Onboarding/CreatePasswordView.js';
import ProtectYourWalletView from '../../page-objects/Onboarding/ProtectYourWalletView.js';
import MetaMetricsOptInView from '../../page-objects/Onboarding/MetaMetricsOptInView.js';
import OnboardingSuccessView from '../../page-objects/Onboarding/OnboardingSuccessView.js';
import { dismisspredictionsModalPlaywright } from '../../flows/wallet.flow.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet.js';
import { fetchProductionFeatureFlags } from '../feature-flag-helper';
import PredictModalView from '../../page-objects/Predict/PredictModalView.js';

const testEnvironment = process.env.E2E_PERFORMANCE_BUILD_VARIANT || '';

/* Scenario 2: Account creation after fresh install */
test.describe(`${PerformanceOnboarding} ${PerformanceAccountList}`, () => {
  test(
    'Account creation after fresh install',
    { tag: '@metamask-onboarding-team' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      await OnboardingView.tapCreateNewWalletButton();
      await PlaywrightAssertions.expectElementToBeVisible(
        await asPlaywrightElement(OnboardingSheet.importSeedButton),
      );

      await OnboardingSheet.tapImportSeedButton();
      await PlaywrightAssertions.expectElementToBeVisible(
        await asPlaywrightElement(CreatePasswordView.newPasswordInput),
      );
      await CreatePasswordView.enterPassword(
        getPasswordForScenario('onboarding') ?? '',
      );
      await CreatePasswordView.reEnterPassword(
        getPasswordForScenario('onboarding') ?? '',
      );
      await PlaywrightGestures.hideKeyboard();

      await CreatePasswordView.tapIUnderstandCheckBox();
      await CreatePasswordView.tapCreatePasswordButton();
      await ProtectYourWalletView.tapRemindMeLater();
      await PlaywrightAssertions.expectElementToBeVisible(
        await asPlaywrightElement(MetaMetricsOptInView.screenTitle),
      );
      await MetaMetricsOptInView.tapAgreeButton();
      await PlaywrightAssertions.expectElementToBeVisible(
        await asPlaywrightElement(OnboardingSuccessView.doneButton),
      );
      await OnboardingSuccessView.tapDone();

      const productionFeatureFlags = await fetchProductionFeatureFlags(
        'main',
        testEnvironment,
      );

      const predictGtmOnboardingModalEnabled = (
        productionFeatureFlags?.predictGtmOnboardingModalEnabled as {
          enabled?: boolean;
        }
      )?.enabled;
      if (
        predictGtmOnboardingModalEnabled &&
        predictGtmOnboardingModalEnabled === true
      ) {
        await PlaywrightAssertions.expectElementToBeVisible(
          await asPlaywrightElement(PredictModalView.notNowButton),
        );
        await dismisspredictionsModalPlaywright();
      }

      const screen1Timer = new TimerHelper(
        'Time since the user clicks on "Account list" button until the account list is visible',
        { ios: 2000, android: 2000 },
        currentDeviceDetails.platform,
      );
      const screen2Timer = new TimerHelper(
        'Time since the user clicks on "Create account" button until the account is in the account list',
        { ios: 1500, android: 1500 },
        currentDeviceDetails.platform,
      );
      const screen3Timer = new TimerHelper(
        'Time since the user clicks on new account created until the Token list is visible',
        { ios: 2000, android: 2000 },
        currentDeviceDetails.platform,
      );

      await withSnapshotSettings({ snapshotMaxDepth: 45 }, async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          await asPlaywrightElement(WalletView.tokensSection),
        );

        await WalletView.tapIdenticon();
        await screen1Timer.measure(
          async () =>
            await PlaywrightAssertions.expectElementToBeVisible(
              await asPlaywrightElement(AccountListBottomSheet.accountList),
            ),
        );

        await AccountListBottomSheet.waitForAccountSyncToComplete();
        await AccountListBottomSheet.tapCreateAccount(0);
        await screen2Timer.measure(
          async () =>
            await PlaywrightAssertions.expectElementToBeVisible(
              await asPlaywrightElement(
                AccountListBottomSheet.accountNameInList('Account 2'),
              ),
            ),
        );

        await AccountListBottomSheet.tapAccountByName('Account 2');
        await screen3Timer.measure(async () => {
          await WalletView.checkActiveAccount('Account 2');
        });
      });

      performanceTracker.addTimers(screen1Timer, screen2Timer, screen3Timer);
    },
  );
});
