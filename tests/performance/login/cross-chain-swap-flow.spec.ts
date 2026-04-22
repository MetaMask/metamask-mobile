import { test } from '../../framework/fixture';
import TimerHelper from '../../framework/TimerHelper.js';
import { PerformanceSwaps } from '../../tags.performance.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import QuoteView from '../../page-objects/swaps/QuoteView.js';

/* Scenario 7: Cross-chain swap flow - ETH to SOL - 50+ accounts, SRP 1 + SRP 2 + SRP 3 */
test.describe(PerformanceSwaps, () => {
  test(
    'Cross-chain swap flow - ETH to SOL - 50+ accounts, SRP 1 + SRP 2 + SRP 3',
    { tag: '@swap-bridge-dev-team' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      await loginToAppPlaywright();

      const timer1 = new TimerHelper(
        'Time since the user clicks on the "Swap" button until the swap page is loaded',
        { ios: 1100, android: 2200 },
        currentDeviceDetails.platform,
      );

      await WalletView.tapWalletSwapButton();
      await timer1.measure(() => QuoteView.isVisible());

      await QuoteView.selectNetworkAndTokenTo('Solana', 'SOL');
      await QuoteView.enterSourceTokenAmount('1');

      const timer2 = new TimerHelper(
        'Time since the user enters the amount until the quote is displayed',
        { ios: 9000, android: 7000 },
        currentDeviceDetails.platform,
      );

      await timer2.measure(() => QuoteView.isQuoteDisplayed());

      performanceTracker.addTimers(timer1, timer2);
    },
  );
});
