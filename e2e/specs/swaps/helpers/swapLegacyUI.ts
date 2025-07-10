import { default as LegacyUIQuoteView } from '../../../pages/swaps/QuoteView';
import SwapView from '../../../pages/swaps/SwapView';
import Assertions from '../../../utils/Assertions';
import TestHelpers from '../../../helpers';

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
    await Assertions.checkIfElementToHaveText(
      LegacyUIQuoteView.maxSlippage,
      'Max slippage 0%',
    );
  }
  await LegacyUIQuoteView.tapOnGetQuotes();
  await Assertions.checkIfVisible(SwapView.quoteSummary);
  await Assertions.checkIfVisible(SwapView.gasFee);
  await SwapView.tapIUnderstandPriceWarning();
  await SwapView.tapSwapButton();
  // Wait for Swap to complete
  try {
    await Assertions.checkIfTextIsDisplayed(
      SwapView.generateSwapCompleteLabel(sourceTokenSymbol, destTokenSymbol),
      30000,
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(`Swap complete didn't pop up: ${e}`);
  }
  await TestHelpers.delay(10000);
}

