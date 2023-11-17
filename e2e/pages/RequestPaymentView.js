import TestHelpers from '../helpers';
import { RequestPaymentViewSelectors } from '../selectors/RequestPaymentView.selectors';

export default class RequestPaymentView {
  static async tapBackButton() {
    await TestHelpers.tapItemAtIndex(
      RequestPaymentViewSelectors.BACK_BUTTON_ID,
    );
  }

  static async searchForToken(token) {
    await TestHelpers.replaceTextInField(
      RequestPaymentViewSelectors.TOKEN_SEARCH_INPUT_BOX,
      token,
    );
    await TestHelpers.delay(1000);
  }

  static async tapOnToken(token) {
    await TestHelpers.tapByText(token, 1);
  }

  static async typeInTokenAmount(amount) {
    await TestHelpers.typeTextAndHideKeyboard(
      RequestPaymentViewSelectors.REQUEST_AMOUNT_INPUT_BOX_ID,
      amount,
    );
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(
      RequestPaymentViewSelectors.REQUEST_PAYMENT_CONTAINER_ID,
    );
  }

  static async isTokenVisibleInSearchResults(token) {
    await TestHelpers.checkIfElementHasString(
      RequestPaymentViewSelectors.REQUEST_ASSET_LIST_ID,
      token,
    );
  }
}
