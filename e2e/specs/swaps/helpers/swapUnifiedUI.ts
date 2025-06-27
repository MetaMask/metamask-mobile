import QuoteView from '../../../pages/Bridge/QuoteView';
import Assertions from '../../../utils/Assertions';

export async function submitSwapUnifiedUI(
  type: string,
  quantity: string,
  sourceTokenSymbol: string,
  destTokenSymbol: string,
  chainId: string,
) {
    await device.disableSynchronization();
    await QuoteView.enterAmount(quantity);

    await QuoteView.tapSourceToken();
    await QuoteView.selectSourceToken(chainId, sourceTokenSymbol);

    await QuoteView.tapSwapTo();
    await QuoteView.selectNetwork('Tenderly - Mainnet');
    await QuoteView.selectDestToken(chainId, destTokenSymbol);

    await device.disableSynchronization();
    await Assertions.checkIfVisible(QuoteView.networkFeeLabel, 60000);
    await Assertions.checkIfVisible(QuoteView.confirmSwap);
    await QuoteView.tapConfirmSwap();
}

