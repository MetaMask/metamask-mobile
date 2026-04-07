import { test } from '../../framework/fixture';
import TimerHelper from '../../framework/TimerHelper';
import { PerformancePreps } from '../../tags.performance.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import PerpsOnboarding from '../../page-objects/Perps/PerpsOnboarding';
import PerpsDepositView from '../../page-objects/Perps/PerpsDepositView';
import WalletActionsBottomSheet from '../../page-objects/wallet/WalletActionsBottomSheet';
import PlaywrightAssertions from '../../framework/PlaywrightAssertions';
import { asPlaywrightElement } from '../../framework/EncapsulatedElement';

/* Scenario 5: Perps add funds */
test.describe(PerformancePreps, () => {
  test(
    'Perps add funds',
    { tag: '@mm-perps-engineering-team' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      test.setTimeout(10 * 60 * 1000); // 10 minutes

      const selectPerpsMainScreenTimer = new TimerHelper(
        'Select Perps Main Screen',
        { ios: 1500, android: 2500 },
        currentDeviceDetails.platform,
      );
      const openAddFundsTimer = new TimerHelper(
        'Open Add Funds',
        { ios: 5000, android: 4500 },
        currentDeviceDetails.platform,
      );
      const getQuoteTimer = new TimerHelper(
        'Get Quote',
        { ios: 6000, android: 7000 },
        currentDeviceDetails.platform,
      );

      await loginToAppPlaywright();
      await TabBarComponent.tapActions();
      await WalletActionsBottomSheet.tapPerpsButton(); // may need to change for catchAll trade perps contracts
      // Open Perps Main Screen
      await selectPerpsMainScreenTimer.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          await asPlaywrightElement(PerpsOnboarding.tutorialTitle),
        );
      });

      // Skip tutorial
      await PerpsOnboarding.tapSkipButton();

      await PerpsOnboarding.tapAddFunds();
      // Open Add Funds flow
      await openAddFundsTimer.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          await asPlaywrightElement(PerpsDepositView.amountInput),
        );
      });

      await PerpsDepositView.typeUSD('2');
      await PerpsDepositView.tapContinue();

      // Get quote
      await getQuoteTimer.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          await asPlaywrightElement(PerpsDepositView.addFundsButton),
        );
        await PlaywrightAssertions.expectElementToBeVisible(
          await asPlaywrightElement(PerpsDepositView.totalText),
        );
      });

      performanceTracker.addTimers(
        selectPerpsMainScreenTimer,
        openAddFundsTimer,
        getQuoteTimer,
      );
    },
  );
});
