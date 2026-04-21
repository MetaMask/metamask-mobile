import { test } from '../../framework/fixture';
import TimerHelper from '../../framework/TimerHelper';
import {
  Performance,
  System,
  PerformanceLogin,
  PerformanceSwaps,
} from '../../tags.performance.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow';
import WalletView from '../../page-objects/wallet/WalletView';
import QuoteView from '../../page-objects/swaps/QuoteView';
import { checkSwapActivity } from '../../helpers/swap/swap-unified-ui';

/* Scenario 6: Swap flow - ETH to LINK, SRP 1 + SRP 2 + SRP 3 */
test.describe(`${Performance} ${System} ${PerformanceLogin} ${PerformanceSwaps}`, () => {
  test(
    'Swap flow - ETH to LINK, SRP 1 + SRP 2 + SRP 3',
    { tag: '@swap-bridge-dev-team' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      test.skip(
        currentDeviceDetails.platform === 'ios',
        'Skipped on iOS — swap flow under investigation',
      );

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
      await QuoteView.selectNetworkAndTokenTo('Ethereum', 'USDC');
      await QuoteView.enterSourceTokenAmount('1');

      await swapTimer.measure(async () => {
        await QuoteView.isQuoteDisplayed();
      });
      performanceTracker.addTimers(swapLoadTimer, swapTimer);

      if (process.env.SUBMIT_SWAP === 'true') {
        await QuoteView.dismissKeypad();
        await QuoteView.tapConfirmSwap();
        await checkSwapActivity('ETH', 'USDC');
      }
    },
  );
});
