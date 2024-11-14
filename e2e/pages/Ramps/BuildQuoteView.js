import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { BuildQuoteSelectors } from '../../selectors/Ramps/BuildQuote.selectors';

class BuildQuoteView {
  get amountToBuyLabel() {
    return Matchers.getElementByText(BuildQuoteSelectors.AMOUNT_TO_BUY_LABEL);
  }

  get amountToSellLabel() {
    return Matchers.getElementByText(BuildQuoteSelectors.AMOUNT_TO_SELL_LABEL);
  }

  get getQuotesButton() {
    return Matchers.getElementByText(BuildQuoteSelectors.GET_QUOTES_BUTTON);
  }

  get cancelButton() {
    return Matchers.getElementByText(BuildQuoteSelectors.CANCEL_BUTTON_TEXT);
  }

  async tapCancelButton() {
    await Gestures.waitAndTap(this.cancelButton);
  }
}

export default new BuildQuoteView();
