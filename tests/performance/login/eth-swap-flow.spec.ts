import { test } from '../../framework/fixture';
import TimerHelper from '../../framework/TimerHelper';
import { PerformanceSwaps } from '../../tags.performance.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow';
import WalletView from '../../page-objects/wallet/WalletView';
import QuoteView from '../../page-objects/swaps/QuoteView';

/* Scenario 6: Swap flow - ETH to LINK, SRP 1 + SRP 2 + SRP 3 */
test.describe(PerformanceSwaps, () => {
  test(
    'Swap flow - ETH to LINK, SRP 1 + SRP 2 + SRP 3',
    { tag: '@swap-bridge-dev-team' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      await loginToAppPlaywright();

      const swapLoadTimer = new TimerHelper(
        'Time since the user clicks on the "Swap" button until the swap page is loaded',
        { ios: 2000, android: 2500 },
        currentDeviceDetails.platform,
      );

      await WalletView.tapWalletSwapButton();
      await swapLoadTimer.measure(() => QuoteView.isVisible());

      const swapTimer = new TimerHelper(
        'Time since the user enters the amount until the quote is displayed',
        { ios: 9000, android: 7000 },
        currentDeviceDetails.platform,
      );
      await QuoteView.selectNetworkAndTokenTo('Ethereum', 'LINK');
      await QuoteView.enterSourceTokenAmount('1');

      await swapTimer.measure(() => QuoteView.isQuoteDisplayed());

      performanceTracker.addTimers(swapLoadTimer, swapTimer);
    },
  );
});
