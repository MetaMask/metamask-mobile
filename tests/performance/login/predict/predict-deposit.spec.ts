import { test as perfTest } from '../../../framework/fixture';
import TimerHelper from '../../../framework/TimerHelper';
import { loginToAppPlaywright } from '../../../flows/wallet.flow';
import { asPlaywrightElement, PlaywrightAssertions } from '../../../framework';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../../page-objects/wallet/WalletActionsBottomSheet';
import TransactionPayConfirmation from '../../../page-objects/Confirmation/TransactionPayConfirmation';
import PredictMarketList from '../../../page-objects/Predict/PredictMarketList';
import { PerformancePredict } from '../../../tags.performance.js';

/*
 * Scenario: Predict Deposit Performance Test
 *
 * This test measures how long it takes to complete a deposit flow
 * under 4G network conditions (default for e2e tests).
 *
 * Test Setup:
 * - Account with multiple open positions and existing balance
 *
 * The test measures:
 * 1. Time to navigate to Predict tab
 * 2. Time to open deposit screen
 * 3. Time to change default asset selection
 * 4. Time to proceed to confirmation screen
 * 5. Time to verify deposit info (fees, amount) appears
 */
perfTest.describe(PerformancePredict, () => {
  perfTest(
    'Predict Deposit - Complete Flow Performance',
    { tag: '@team-predict' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      // Login to the app
      await loginToAppPlaywright();

      // Timer 1: Navigate to Predict tab
      const timer1 = new TimerHelper(
        'Time since user taps Predict button until Predict Market List is displayed',
        { ios: 8000, android: 8000 },
        currentDeviceDetails.platform,
      );

      await TabBarComponent.tapActions();
      await WalletActionsBottomSheet.tapPredictButton();
      await timer1.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(PredictMarketList.container),
        );
      });

      // Timer 2: Open deposit screen
      const timer2 = new TimerHelper(
        'Time since user taps Add Funds button until Predict Deposit screen is visible',
        { ios: 1000, android: 1500 },
        currentDeviceDetails.platform,
      );

      await PredictMarketList.tapAddFundsButton();
      await timer2.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(TransactionPayConfirmation.keyboardContainer),
        );
      });

      // Timer 3: Change default asset
      const timer3 = new TimerHelper(
        'Time since user taps Pay with button until select payment method modal is displayed',
        { ios: 5000, android: 1500 },
        currentDeviceDetails.platform,
      );

      await TransactionPayConfirmation.tapPayWithRow();
      await timer3.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(TransactionPayConfirmation.payWithTokenList),
        );
      });

      await TransactionPayConfirmation.searchToken('USDC');
      await TransactionPayConfirmation.tapEthereumFilter();
      await TransactionPayConfirmation.tapFirstUsdc('USDC');
      await TransactionPayConfirmation.tapKeyboardAmount('1');

      // Timer 4: Proceed to confirmation screen
      const timer4 = new TimerHelper(
        'Time since user taps Continue button until quote is displayed on confirmation page',
        { ios: 4000, android: 3500 },
        currentDeviceDetails.platform,
      );

      await TransactionPayConfirmation.tapKeyboardContinueButton();
      await timer4.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(TransactionPayConfirmation.total),
        );
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(TransactionPayConfirmation.transactionFee),
        );
      });

      // Add all timers to performance tracker
      performanceTracker.addTimers(timer1, timer2, timer3, timer4);

      // Attach performance metrics to test report

      console.log('Predict Deposit Performance Test completed');
      console.log(`Navigate to Predict: ${timer1.getDuration()}ms`);
      console.log(`Open Deposit Screen: ${timer2.getDuration()}ms`);
      console.log(`Change Asset: ${timer3.getDuration()}ms`);
      console.log(`Open Confirmation: ${timer4.getDuration()}ms`);
      console.log(
        `Total Time: ${
          (timer1.getDuration() ?? 0) +
          (timer2.getDuration() ?? 0) +
          (timer3.getDuration() ?? 0) +
          (timer4.getDuration() ?? 0)
        }ms`,
      );
    },
  );
});
