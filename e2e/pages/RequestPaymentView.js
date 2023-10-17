import TestHelpers from '../helpers';

const BACK_BUTTON_ID = 'request-search-asset-back-button';
const REQUEST_PAYMENT_CONTAINER_ID = 'request-screen';
const REQUEST_ASSET_LIST_ID = 'searched-asset-results';
const REQUEST_AMOUNT_INPUT_BOX_ID = 'request-amount-input';
const TOKEN_SEARCH_INPUT_BOX = 'request-search-asset-input';
export default class RequestPaymentView {
  static async tapETH() {
    await TestHelpers.tapItemAtIndex(REQUEST_ASSET_LIST_ID);
  }
  static async tapBackButton() {
    await TestHelpers.tapItemAtIndex(BACK_BUTTON_ID);
  }

  static async searchForToken(token) {
    if (device.getPlatform() === 'android') {
      await TestHelpers.typeTextAndHideKeyboard(TOKEN_SEARCH_INPUT_BOX, token);
      await TestHelpers.delay(2500);
    } else {
      await TestHelpers.replaceTextInField(TOKEN_SEARCH_INPUT_BOX, token);
      await TestHelpers.delay(1000);
    }
  }
  static async tapOnToken(token) {
    await TestHelpers.tapByText(token, 1);
  }
  static async typeInTokenAmount(amount) {
    await TestHelpers.typeTextAndHideKeyboard(
      REQUEST_AMOUNT_INPUT_BOX_ID,
      amount,
    );
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(REQUEST_PAYMENT_CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(REQUEST_PAYMENT_CONTAINER_ID);
  }
  static async isRequestTitleVisible() {
    await TestHelpers.checkIfElementWithTextIsVisible('Request');
  }
  static async isTokenVisibleInSearchResults(token) {
    await TestHelpers.checkIfElementHasString(REQUEST_ASSET_LIST_ID, token);
  }
}
