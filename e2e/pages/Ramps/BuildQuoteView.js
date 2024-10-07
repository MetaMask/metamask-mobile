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
  
  get amountInput() {
    return Matchers.getElementByID(BuildQuoteSelectors.AMOUNT_INPUT);
  }

  get currencySelector() {
    return Matchers.getElementByID(BuildQuoteSelectors.CURRENCY_SELECTOR);
  }
  
  async tapCancelButton() {
    await Gestures.waitAndTap(this.cancelButton);
  }

  async tapGetQuotesButton() {
    await Gestures.waitAndTap(this.getQuotesButton);
  }

  async openCurrencySelector() {
    await Gestures.waitAndTap(this.currencySelector);
  }

  async selectCurrency(currency) {
    await Gestures.waitAndTap(Matchers.getElementByText(currency))
  }

  async enterFiatAmount(amount) {
    await Gestures.waitAndTap(Matchers.getElementByID(BuildQuoteSelectors.AMOUNT_INPUT))
    for (let digit = 0; digit < amount.length; digit++) {
      const numberButton = Matchers.getElementByText(amount[digit]);
      await Gestures.waitAndTap(numberButton);
    }
    await Gestures.waitAndTap(Matchers.getElementByText(BuildQuoteSelectors.DONE_BUTTON))
  }
}

export default new BuildQuoteView();