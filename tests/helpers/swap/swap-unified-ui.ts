import TestHelpers from '../../../e2e/helpers';
import QuoteView from '../../../e2e/pages/swaps/QuoteView';
import SlippageModal from '../../../e2e/pages/swaps/SlippageModal';
import Assertions from '../../framework/Assertions';
import ActivitiesView from '../../../e2e/pages/Transactions/ActivitiesView';
import { ActivitiesViewSelectorsText } from '../../../app/components/Views/ActivityView/ActivitiesView.testIds';

interface SwapOptions {
  /** Custom slippage percentage (e.g., "2.5" for 2.5%) */
  slippage?: string;
}

export async function submitSwapUnifiedUI(
  quantity: string,
  sourceTokenSymbol: string,
  destTokenSymbol: string,
  chainId: string,
  options?: SwapOptions,
) {
  const DEFAULT_SLIPPAGE_VALUE = '2';
  await device.disableSynchronization();
  await Assertions.expectElementToBeVisible(QuoteView.selectAmountLabel);
  await QuoteView.enterAmount(quantity);
  if (sourceTokenSymbol !== 'ETH') {
    await QuoteView.tapSourceToken();
    await QuoteView.tapToken(chainId, sourceTokenSymbol);
  }
  await QuoteView.tapDestinationToken();
  await QuoteView.tapToken(chainId, destTokenSymbol);

  await Assertions.expectElementToBeVisible(QuoteView.networkFeeLabel, {
    timeout: 60000,
  });

  // Set custom slippage if provided
  if (options?.slippage) {
    await SlippageModal.setCustomSlippage(options.slippage);
    // Verify the slippage has been updated in the quote view
    await QuoteView.verifySlippageDisplayed(options.slippage);
  } else {
    await QuoteView.verifySlippageDisplayed(DEFAULT_SLIPPAGE_VALUE);
  }

  await Assertions.expectElementToBeVisible(QuoteView.confirmSwap);

  await QuoteView.tapConfirmSwap();
}

export async function checkSwapActivity(
  sourceTokenSymbol: string,
  destTokenSymbol: string,
) {
  const FIRST_ROW: number = 0;
  const SECOND_ROW: number = 1;

  // Check the swap activity completed
  await Assertions.expectElementToBeVisible(ActivitiesView.title);
  await Assertions.expectElementToBeVisible(
    ActivitiesView.swapActivityTitle(sourceTokenSymbol, destTokenSymbol),
  );
  await Assertions.expectElementToHaveText(
    ActivitiesView.transactionStatus(FIRST_ROW),
    ActivitiesViewSelectorsText.CONFIRM_TEXT,
  );

  // Check the token approval completed
  if (sourceTokenSymbol !== 'ETH') {
    await Assertions.expectElementToBeVisible(
      ActivitiesView.swapApprovalActivityTitle(sourceTokenSymbol),
    );
    await Assertions.expectElementToHaveText(
      ActivitiesView.transactionStatus(SECOND_ROW),
      ActivitiesViewSelectorsText.CONFIRM_TEXT,
    );
  }

  // Wait for tx toast to clear
  await TestHelpers.delay(5000);
}
