import TestHelpers from '../helpers';
import { RequestPaymentViewSelectors } from '../selectors/RequestPaymentView.selectors';
import { strings } from '../../locales/i18n';

export default class RequestPaymentViewPage {
  static get backButton() {
    return RequestPaymentViewSelectors.BACK_BUTTON_ID;
  }

  static get tokenSearchInput() {
    return RequestPaymentViewSelectors.TOKEN_SEARCH_INPUT_BOX;
  }

  static get requestAmountInput() {
    return RequestPaymentViewSelectors.REQUEST_AMOUNT_INPUT_BOX_ID;
  }

  static get requestPaymentContainer() {
    return RequestPaymentViewSelectors.REQUEST_PAYMENT_CONTAINER_ID;
  }

  static get requestAssetList() {
    return RequestPaymentViewSelectors.REQUEST_ASSET_LIST_ID;
  }

  static async tap(element) {
    await TestHelpers.tap(element);
  }

  static async typeText(element, text) {
    await TestHelpers.typeTextAndHideKeyboard(element, text);
  }

  static async checkVisibility(element) {
    await TestHelpers.checkIfVisible(element);
  }

  /**
   * Taps the back button in the Request Payment view.
   *
   * @returns {Promise<void>}
   */
  static async tapBackButton() {
    await this.tap(this.backButton);
  }

  /**
   * Searches for a specific token in the Request Payment view.
   *
   * @param {string} token - The name or symbol of the token to search for.
   * @returns {Promise<void>}
   */
  static async searchForToken(token) {
    await TestHelpers.replaceTextInField(this.tokenSearchInput, token);
    await TestHelpers.delay(1000);
  }

  /**
   * Taps on a specific token in the Request Payment view.
   *
   * @param {string} token - The name or symbol of the token to tap on.
   * @returns {Promise<void>}
   */
  static async tapOnToken(token) {
    await TestHelpers.tapByText(
      strings('request_payment.token_name', { token }),
    );
  }

  /**
   * Types in the token amount in the Request Payment view.
   *
   * @param {string} amount - The amount of tokens to request.
   * @returns {Promise<void>}
   */
  static async typeInTokenAmount(amount) {
    await this.typeText(this.requestAmountInput, amount);
  }

  /**
   * Checks if the Request Payment view is visible.
   *
   * @returns {Promise<void>}
   */
  static async isVisible() {
    await this.checkVisibility(this.requestPaymentContainer);
  }

  /**
   * Checks if a specific token is visible in the search results.
   *
   * @param {string} token - The name or symbol of the token to check for.
   * @returns {Promise<void>}
   */
  static async isTokenVisibleInSearchResults(token) {
    await TestHelpers.checkIfElementHasString(
      this.requestAssetList,
      strings('request_payment.token_name', { token }),
    );
  }
}
