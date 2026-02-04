import { test } from '../../../../fixtures/performance-test.js';

import TimerHelper from '../../../../utils/TimersHelper.js';
import LoginScreen from '../../../../../wdio/screen-objects/LoginScreen.js';
import WalletMainScreen from '../../../../../wdio/screen-objects/WalletMainScreen.js';
import TabBarModal from '../../../../../wdio/screen-objects/Modals/TabBarModal.js';
import WalletActionModal from '../../../../../wdio/screen-objects/Modals/WalletActionModal.js';
import PredictMarketListScreen from '../../../../../wdio/screen-objects/PredictMarketListScreen.js';
import PredictDepositScreen from '../../../../../wdio/screen-objects/PredictDepositScreen.js';
import PredictConfirmationScreen from '../../../../../wdio/screen-objects/PredictConfirmationScreen.js';
import { login } from '../../../../utils/Flows.js';
import { PerformancePredict } from '../../../../tags.js';

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
 * 4. Time to enter deposit amount
 * 5. Time to proceed to confirmation screen
 * 6. Time to verify deposit info (fees, amount) appears
 */
test.describe(PerformancePredict, () => {
  test(
    'Predict Deposit - Complete Flow Performance',
    { tag: '@team-predict' },
    async ({ device, performanceTracker }, testInfo) => {
      // Setup screen objects with device
      LoginScreen.device = device;
      WalletMainScreen.device = device;
      TabBarModal.device = device;
      WalletActionModal.device = device;
      PredictMarketListScreen.device = device;
      PredictDepositScreen.device = device;
      PredictConfirmationScreen.device = device;

      // Login to the app
      await login(device);
      await TabBarModal.tapActionButton();

      // Timer 1: Navigate to Predict tab
      const timer1 = new TimerHelper(
        'Time since user taps Predict button until Predict Market List is displayed',
        { ios: 2300, android: 2600 },
        device,
      );
      await timer1.measure(async () => {
        await WalletActionModal.tapPredictButton();
        await PredictMarketListScreen.isContainerDisplayed();
      });

      // Timer 2: Open deposit screen
      const timer2 = new TimerHelper(
        'Time since user taps Add Funds button until Deposit screen is displayed',
        { ios: 7000, android: 12000 },
        device,
      );
      await timer2.measure(async () => {
        await PredictMarketListScreen.tapAddFundsButton();
        await PredictDepositScreen.isAmountInputVisible();
      });

      // Timer 3: Change default asset
      const timer3 = new TimerHelper(
        'Time since user taps Pay With button until select payment method modal appears',
        { ios: 4500, android: 2900 },
        device,
      );
      await timer3.measure(async () => {
        await PredictDepositScreen.tapPayWith();
        // Wait for asset selection modal to appear
        await PredictDepositScreen.isSelectPaymentVisible();
      });

      // Timer 4: Search, select and enter amount for asseet to pay
      const timer4 = new TimerHelper(
        'Time user search, select and enter amount for asseet to pay',
        { ios: 15000, android: 12000 },
        device,
      );
      await timer4.measure(async () => {
        // Search for USDC and select the first visible option
        await PredictDepositScreen.searchToken('USDC');
        await PredictDepositScreen.tapEthereumFilter();
        await PredictDepositScreen.tapFirstUsdc('USDC');
        await PredictDepositScreen.fillUsdAmount('1');
      });

      // Timer 5: Proceed to confirmation screen
      const timer5 = new TimerHelper(
        'Time since user taps Continue until Confirmation screen is displayed',
        { ios: 4800, android: 9000 },
        device,
      );
      await timer5.measure(async () => {
        await PredictDepositScreen.tapContinue();
        await PredictConfirmationScreen.verifyDepositAmount('1');
        await PredictConfirmationScreen.verifyFeesDisplayed();
      });

      // Add all timers to performance tracker
      performanceTracker.addTimers(timer1, timer2, timer3, timer4, timer5);

      // Attach performance metrics to test report
      await performanceTracker.attachToTest(testInfo);

      console.log('✅ Predict Deposit Performance Test completed');
      console.log(`📊 Navigate to Predict: ${timer1.getDuration()}ms`);
      console.log(`📊 Open Deposit Screen: ${timer2.getDuration()}ms`);
      console.log(`📊 Change Asset: ${timer3.getDuration()}ms`);
      console.log(`📊 Enter Amount: ${timer4.getDuration()}ms`);
      console.log(`📊 Open Confirmation: ${timer5.getDuration()}ms`);

      console.log(
        `📊 Total Time: ${
          timer1.getDuration() +
          timer2.getDuration() +
          timer3.getDuration() +
          timer4.getDuration() +
          timer5.getDuration()
        }ms`,
      );
    },
  );
});
