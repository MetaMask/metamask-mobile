import { default as LegacyUIQuoteView } from '../../../pages/swaps/QuoteView';
import SwapView from '../../../pages/swaps/SwapView';
import Assertions from '../../../framework/Assertions';
import TestHelpers from '../../../helpers';
import { createLogger } from '../../../framework/logger';

const logger = createLogger({
  name: 'SwapLegacyUI',
});

export async function submitSwapLegacyUI(
  quantity: string,
  sourceTokenSymbol: string,
  destTokenSymbol: string,
) {
  const firstElement: number = 0;

  await device.disableSynchronization();
  // Select source token, if native token can skip because already selected
  if (sourceTokenSymbol !== 'ETH') {
    await LegacyUIQuoteView.tapOnSelectSourceToken();
    await LegacyUIQuoteView.selectToken(sourceTokenSymbol, firstElement);
  }
  await LegacyUIQuoteView.enterSwapAmount(quantity);

  // Select destination token
  await LegacyUIQuoteView.tapOnSelectDestToken();
  if (destTokenSymbol !== 'ETH') {
    await LegacyUIQuoteView.tapSearchToken();
    await LegacyUIQuoteView.typeSearchToken(destTokenSymbol);
    await TestHelpers.delay(3000);
    await LegacyUIQuoteView.selectToken(destTokenSymbol);
  } else {
    await LegacyUIQuoteView.selectToken(destTokenSymbol, firstElement);
  }

  // Make sure slippage is zero for wrapped tokens
  if (sourceTokenSymbol === 'WETH' || destTokenSymbol === 'WETH') {
    await Assertions.expectElementToHaveText(
      LegacyUIQuoteView.maxSlippage,
      'Max slippage 0%',
    );
  }
  await LegacyUIQuoteView.tapOnGetQuotes();
  await Assertions.expectElementToBeVisible(SwapView.quoteSummary);
  await Assertions.expectElementToBeVisible(SwapView.gasFee);
  await SwapView.tapIUnderstandPriceWarning();
  await SwapView.tapSwapButton();
  // Wait for Swap to complete
  try {
    await Assertions.expectTextDisplayed(
      SwapView.generateSwapCompleteLabel(sourceTokenSymbol, destTokenSymbol),
    );
  } catch (e) {
    logger.error(`Swap complete didn't pop up: ${e}`);
  }
  await TestHelpers.delay(10000);
}
