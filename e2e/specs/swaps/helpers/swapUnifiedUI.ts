import TestHelpers from '../../../helpers';
import QuoteView from '../../../pages/Bridge/QuoteView';
import Assertions from '../../../utils/Assertions';

export async function submitSwapUnifiedUI(
  quantity: string,
  sourceTokenSymbol: string,
  destTokenSymbol: string,
  chainId: string,
) {
    await device.disableSynchronization();
    await Assertions.checkIfVisible(QuoteView.selectAmountLabel);
    await QuoteView.enterAmount(quantity);

    if (sourceTokenSymbol!=='ETH') {
      await QuoteView.tapSourceToken();
      await QuoteView.tapToken(chainId, sourceTokenSymbol);
    }

    await QuoteView.tapSwapTo();
    await TestHelpers.delay(2000);
    await QuoteView.selectNetwork('Localhost');
    await QuoteView.tapToken(chainId, destTokenSymbol);

    await device.disableSynchronization();
    await Assertions.checkIfVisible(QuoteView.networkFeeLabel, 60000);
    await Assertions.checkIfVisible(QuoteView.confirmSwap);
    await QuoteView.tapConfirmSwap();
}

