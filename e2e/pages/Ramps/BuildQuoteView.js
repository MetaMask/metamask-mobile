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

  get selectRegionDropdown() {
    return Matchers.getElementByText(BuildQuoteSelectors.SELECT_REGION);
  }

  get selectPaymentMethodDropdown() {
    return Matchers.getElementByText(BuildQuoteSelectors.SELECT_PAYMENT_METHOD);
  }

  get selectCurrencyDropdown() {
    return Matchers.getElementByID(BuildQuoteSelectors.SELECT_CURRENCY);
  }

  get amountInput() {
    return Matchers.getElementByID(BuildQuoteSelectors.AMOUNT_INPUT);
  }

  get regionDropdown() {
    return Matchers.getElementByID(BuildQuoteSelectors.REGION_DROPDOWN);
  }

  get minLimitErrorMessage() {
    return Matchers.getElementByID(BuildQuoteSelectors.MIN_LIMIT_ERROR);
  }

  get maxLimitErrorMessage() {
    return Matchers.getElementByID(BuildQuoteSelectors.MAX_LIMIT_ERROR);
  }

  async tapCancelButton() {
    await Gestures.waitAndTap(this.cancelButton);
  }

  async selectToken(token) {
    const tokenOption = Matchers.getElementByText(token);
    await Gestures.waitAndTap(tokenOption);
  }

  async tapTokenDropdown(token) {
    const tokenOption = Matchers.getElementByText(token);
    await Gestures.waitAndTap(tokenOption);
  }

  async tapSelectRegionDropdown() {
    await Gestures.waitAndTap(this.selectRegionDropdown);
  }

  async tapCurrencySelector() {
    await Gestures.waitAndTap(this.selectCurrencyDropdown);
  }

  async enterFiatAmount(amount) {
    await Gestures.waitAndTap(Matchers.getElementByID(BuildQuoteSelectors.AMOUNT_INPUT))
    for (let digit = 0; digit < amount.length; digit++) {
      const numberButton = Matchers.getElementByText(amount[digit]);
      await Gestures.waitAndTap(numberButton);
    }
    await Gestures.waitAndTap(Matchers.getElementByText(BuildQuoteSelectors.DONE_BUTTON))
  }

  async tapGetQuotesButton() {
    await Gestures.waitAndTap(this.getQuotesButton);
  }

  async tapPaymentMethodDropdown(paymentMethod) {
    const paymentMethodOption = Matchers.getElementByText(paymentMethod);
    await Gestures.waitAndTap(paymentMethodOption);
  }

  async tapRegionSelector() {
    await Gestures.waitAndTap(this.regionDropdown);
  }
}

export default new BuildQuoteView();
