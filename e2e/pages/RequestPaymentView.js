import { RequestPaymentViewSelectors } from '../selectors/RequestPaymentView.selectors';
import Matchers from '../utils/Matchers';
import Gestures from '../utils/Gestures';

class RequestPaymentView {
  get backButton() {
    return Matchers.getElementByID(RequestPaymentViewSelectors.BACK_BUTTON_ID);
  }

  get tokenSearchInput() {
    return Matchers.getElementByID(
      RequestPaymentViewSelectors.TOKEN_SEARCH_INPUT_BOX,
    );
  }

  get requestAmountInput() {
    return Matchers.getElementByID(
      RequestPaymentViewSelectors.REQUEST_AMOUNT_INPUT_BOX_ID,
    );
  }

  get requestPaymentContainer() {
    return Matchers.getElementByID(
      RequestPaymentViewSelectors.REQUEST_PAYMENT_CONTAINER_ID,
    );
  }

  get requestAssetList() {
    return Matchers.getElementByID(
      RequestPaymentViewSelectors.REQUEST_ASSET_LIST_ID,
    );
  }

  async tapBackButton() {
    await Gestures.tap(this.backButton);
  }

  async searchForToken(token) {
    await Gestures.typeTextAndHideKeyboard(this.tokenSearchInput, token);
  }

  async tapOnToken(token) {
    const tokenElement = await Matchers.getElementByText(token, 1);
    await Gestures.tap(tokenElement);
  }

  async typeInTokenAmount(amount) {
    await Gestures.typeTextAndHideKeyboard(this.requestAmountInput, amount);
  }
}

export default new RequestPaymentView();
