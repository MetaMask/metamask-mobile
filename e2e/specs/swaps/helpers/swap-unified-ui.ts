import TestHelpers from '../../../helpers';
import QuoteView from '../../../pages/swaps/QuoteView';
import Assertions from '../../../framework/Assertions';

export async function submitSwapUnifiedUI(
  quantity: string,
  sourceTokenSymbol: string,
  destTokenSymbol: string,
  chainId: string,
) {
  await device.disableSynchronization();
  await Assertions.expectElementToBeVisible(QuoteView.selectAmountLabel);
  await QuoteView.enterAmount(quantity);
  if (sourceTokenSymbol !== 'ETH') {
    await QuoteView.tapSourceToken();
    await QuoteView.tapToken(chainId, sourceTokenSymbol);
  }
  await QuoteView.tapDestToken();
  await TestHelpers.delay(2000);
  await QuoteView.tapToken(chainId, destTokenSymbol);

  await Assertions.expectElementToBeVisible(QuoteView.networkFeeLabel, {
    timeout: 60000,
  });
  await Assertions.expectElementToBeVisible(QuoteView.confirmSwap);
  await QuoteView.tapConfirmSwap();
}
