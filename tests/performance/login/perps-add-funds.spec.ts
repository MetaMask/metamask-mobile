import { test } from '../../framework/fixtures/playwright';
import TimerHelper from '../../framework/TimerHelper';
import { Performance, PerformancePreps } from '../../tags.performance.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow';
import { resolvePerpsGtmOnboardingModalEnabled } from '../../flows/perps.flow.js';
import { fetchProductionFeatureFlags } from '../feature-flag-helper.js';
import PerpsOnboarding from '../../page-objects/Perps/PerpsOnboarding';
import PerpsDepositView from '../../page-objects/Perps/PerpsDepositView';
import WalletView from '../../page-objects/wallet/WalletView.js';
import AppiumAssertions from '../../framework/AppiumAssertions';
import TransactionPayConfirmation from '../../page-objects/Confirmation/TransactionPayConfirmation';
import { enableHermesAppProfiling } from '../helpers/appProfiling';

const testEnvironment = process.env.E2E_PERFORMANCE_BUILD_VARIANT || 'rc';

/* Scenario 5: Perps add funds */
test.describe(`${Performance} ${PerformancePreps}`, () => {
  test(
    'Perps add funds',
    { tag: '@mm-perps-engineering-team' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      test.setTimeout(10 * 60 * 1000); // 10 minutes

      const selectPerpsMainScreenTimer = new TimerHelper(
        'Select Perps Main Screen',
        { ios: 1500, android: 4200 },
        currentDeviceDetails.platform,
      );
      const openAddFundsTimer = new TimerHelper(
        'Open Add Funds',
        { ios: 5000, android: 4000 },
        currentDeviceDetails.platform,
      );
      const getQuoteTimer = new TimerHelper(
        'Get Quote',
        { ios: 6000, android: 7000 },
        currentDeviceDetails.platform,
      );

      // Fetched before the tap so the network call is not part of the
      // tap-to-tutorial time.
      const productionFeatureFlags = await fetchProductionFeatureFlags(
        'main',
        testEnvironment,
      );

      await loginToAppPlaywright();
      await enableHermesAppProfiling();
      await WalletView.scrollAndTapPerpsSection();

      const perpsGtmOnboardingModalEnabled =
        await resolvePerpsGtmOnboardingModalEnabled(productionFeatureFlags);

      if (perpsGtmOnboardingModalEnabled) {
        // Open Perps Main Screen
        await selectPerpsMainScreenTimer.measure(async () => {
          await AppiumAssertions.expectElementToBeVisible(
            PerpsOnboarding.tutorialTitle,
          );
        });

        // Skip tutorial
        await PerpsOnboarding.tapSkipButton();
      }

      await PerpsOnboarding.tapAddFunds();
      // Open Add Funds flow
      await openAddFundsTimer.measure(async () => {
        await AppiumAssertions.expectElementToBeVisible(
          PerpsDepositView.amountInput,
        );
      });

      await PerpsDepositView.typeUSD('1');
      await PerpsDepositView.tapContinue();

      // Get quote
      await getQuoteTimer.measure(async () => {
        await AppiumAssertions.expectElementToBeVisible(
          TransactionPayConfirmation.transactionFee,
        );
      });

      if (perpsGtmOnboardingModalEnabled) {
        performanceTracker.addTimer(selectPerpsMainScreenTimer);
      }
      performanceTracker.addTimers(openAddFundsTimer, getQuoteTimer);
    },
  );
});
