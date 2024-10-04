import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { BuildQuoteSelectors } from '../../selectors/Ramps/BuildQuote.selectors';

class BuildQuoteView {
  get amountToBuyLabel() {
    return Matchers.getElementByText(BuildQuoteSelectors.AMOUNT_TO_BUY_LABEL);
  }

  get getQuotesButton() {
    return Matchers.getElementByText(BuildQuoteSelectors.GET_QUOTES_BUTTON);
  }

  get cancelButton() {
    return Matchers.getElementByText(BuildQuoteSelectors.CANCEL_BUTTON);
  }

  get currencySelector() {
    return Matchers.getElementByID(BuildQuoteSelectors.CURRENCY_SELECTOR);
  }

  async tapCancelButton() {
    await Gestures.waitAndTap(this.cancelButton);
  }

  async openCurrencySelector() {
    await Gestures.waitAndTap(this.currencySelector);
  }

  async selectCurrency(currency) {
    await Gestures.waitAndTap(Matchers.getElementByText(currency))
  }
}

export default new BuildQuoteView();
