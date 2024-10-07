import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

import { BuildQuoteSelectors } from '../../selectors/Ramps/BuildQuote.selectors';
import TestHelpers from '../../helpers';

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

  get tokenSelector() {
    return Matchers.getElementByID(BuildQuoteSelectors.TOKEN_SELECTOR);
  }

  get regionSelector() {
    return Matchers.getElementByID(BuildQuoteSelectors.REGION_SELECTOR);
  }

  get paymentMethodSelector() {
    return Matchers.getElementByID(BuildQuoteSelectors.PAYMENT_METHOD_SELECTOR);
  }

  get minLimitErrorMessage() {
    return Matchers.getElementByText(BuildQuoteSelectors.MIN_LIMIT_ERROR);
  }

  get maxLimitErrorMessage() {
    return Matchers.getElementByText(BuildQuoteSelectors.MAX_LIMIT_ERROR);
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
    await Gestures.waitAndTap(Matchers.getElementByText(currency));
  }

  async openRegionSelector() {
    await Gestures.waitAndTap(this.regionSelector);
  }

  async selectRegion(region) {
    await Gestures.waitAndTap(Matchers.getElementByText(region));
  }

  async openPaymentMethodSelector() {
    await Gestures.waitAndTap(this.paymentMethodSelector);
  }

  async selectPaymentMethod(paymentMethod) {
    await Gestures.waitAndTap(Matchers.getElementByText(paymentMethod));
  }

  async enterFiatAmount(amount) {
    await Gestures.waitAndTap(Matchers.getElementByID(BuildQuoteSelectors.AMOUNT_INPUT));
    for (let digit = 0; digit < amount.length; digit++) {
      const numberButton = Matchers.getElementByText(amount[digit]);
      await Gestures.waitAndTap(numberButton);
    }
    await Gestures.waitAndTap(Matchers.getElementByText(BuildQuoteSelectors.DONE_BUTTON));
  }

  async openTokenSelector() {
    await Gestures.waitAndTap(this.tokenSelector);
  }

  async selectToken(token) {
    await Gestures.waitAndTap(Matchers.getElementByText(token));
  }
}

export default new BuildQuoteView();
