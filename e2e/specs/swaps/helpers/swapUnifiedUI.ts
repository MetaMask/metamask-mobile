import QuoteView from '../../../pages/Bridge/QuoteView';
import Assertions from '../../../utils/Assertions';
import TestHelpers from '../../../helpers';

export async function submitSwapUnifiedUI(
  type: string,
  quantity: string,
  sourceTokenSymbol: string,
  destTokenSymbol: string,
) {
    await device.disableSynchronization();
    await QuoteView.enterAmount(quantity);
    if (type !== 'native' && type !== 'wrap') {
      await QuoteView.tapToken('ETH');
      await QuoteView.selectSourceToken(sourceTokenSymbol);
    }
    await QuoteView.tapSwapTo();
    await QuoteView.selectNetwork('Tenderly - Mainnet');
    await QuoteView.selectDestToken(destTokenSymbol);

    await device.disableSynchronization();
    await Assertions.checkIfVisible(QuoteView.networkFeeLabel, 60000);
    await Assertions.checkIfVisible(QuoteView.confirmSwap);
    await QuoteView.tapConfirmSwap();
}

