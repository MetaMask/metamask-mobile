import { RequestPaymentViewSelectorsIDs } from './RequestPaymentView.selectors';
import Matchers from '../utils/Matchers';
import Gestures from '../utils/Gestures';

class RequestPaymentView {
  get backButton() {
    return Matchers.getElementByID(RequestPaymentViewSelectorsIDs.BACK_BUTTON);
  }

  get tokenSearchInput() {
    return Matchers.getElementByID(
      RequestPaymentViewSelectorsIDs.TOKEN_SEARCH_INPUT_BOX,
    );
  }

  get requestAmountInput() {
    return Matchers.getElementByID(
      RequestPaymentViewSelectorsIDs.REQUEST_AMOUNT_INPUT_BOX,
    );
  }

  get requestPaymentContainer() {
    return Matchers.getElementByID(RequestPaymentViewSelectorsIDs.REQUEST_PAYMENT_CONTAINER);
  }

  async tapBackButton() {
    await Gestures.tap(this.backButton);
  }

  async searchForToken(token) {
    await Gestures.typeTextAndHideKeyboard(this.tokenSearchInput, token);
  }

  async tapOnToken(token) {
    const tokenElement = Matchers.getElementByText(token);
    await Gestures.tap(tokenElement);
  }

  async typeInTokenAmount(amount) {
    await Gestures.typeTextAndHideKeyboard(this.requestAmountInput, amount);
  }
}

export default new RequestPaymentView();
