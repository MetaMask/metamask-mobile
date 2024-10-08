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

  async enterFiatAmount(amount) {
    await Gestures.waitAndTap(Matchers.getElementByID(BuildQuoteSelectors.AMOUNT_INPUT));
    for (let digit = 0; digit < amount.length; digit++) {
      const numberButton = Matchers.getElementByText(amount[digit]);
      await Gestures.waitAndTap(numberButton);
    }
    await Gestures.waitAndTap(Matchers.getElementByText(BuildQuoteSelectors.DONE_BUTTON));
  }
}

export default new BuildQuoteView();
