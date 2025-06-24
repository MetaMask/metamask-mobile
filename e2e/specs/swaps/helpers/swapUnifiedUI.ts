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
    await QuoteView.tapBridgeTo();
    await TestHelpers.delay(1000);
    if (type !== 'native')
      await Assertions.checkIfVisible(QuoteView.token(sourceTokenSymbol));
    await QuoteView.selectToken(destTokenSymbol);
    await Assertions.checkIfVisible(QuoteView.networkFeeLabel, 60000);
    await Assertions.checkIfVisible(QuoteView.confirmButton);
    await QuoteView.tapConfirm();
}

