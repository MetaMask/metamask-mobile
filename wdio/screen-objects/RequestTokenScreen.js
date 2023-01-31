import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures';
import {
  REQUEST_AMOUNT_INPUT,
  PAYMENT_REQUEST_CLOSE_BUTTON,
  REQUEST_SEARCH_ASSET_INPUT,
  REQUEST_SEARCH_RESULTS_BACK_BUTTON,
  REQUEST_SEARCH_SCREEN,
  PAYMENT_REQUEST_QR_CODE_CLOSE_ICON,
} from '../screen-objects/testIDs/Screens/RecieveToken.testIds';

class RequestTokenScreen {
  get requestAmount() {
    return Selectors.getElementByPlatform(REQUEST_AMOUNT_INPUT);
  }

  get requestCloseButton() {
    return Selectors.getElementByPlatform(PAYMENT_REQUEST_CLOSE_BUTTON);
  }

  get requestSearchInput() {
    return Selectors.getElementByPlatform(REQUEST_SEARCH_ASSET_INPUT);
  }

  get requestSearchBackButton() {
    return Selectors.getElementByPlatform(REQUEST_SEARCH_RESULTS_BACK_BUTTON);
  }

  get requestSearchScreen() {
    return Selectors.getElementByPlatform(REQUEST_SEARCH_SCREEN);
  }

  get closeRequestPaymentQRIcon() {
    return Selectors.getElementByPlatform(PAYMENT_REQUEST_QR_CODE_CLOSE_ICON);
  }

  async typeAmountInRequest(amount) {
    await Gestures.setValueWithoutTap(this.requestAmount, amount);
  }

  async isTextElementDisplayed(text) {
    await expect(Selectors.getXpathElementByText(text)).toBeDisplayed();
  }

  async isTextElementNotDisplayed(text) {
    await expect(Selectors.getXpathElementByText(text)).not.toBeDisplayed();
  }

  async closePaymentRequest() {
    await Gestures.tap(this.requestCloseButton);
  }

  async inputSearchRequestField(searchReq) {
    await Gestures.typeText(this.requestSearchInput, searchReq);
  }

  async tapBackButtonOnSearch(searchReq) {
    await Gestures.tap(this.requestSearchBackButton);
  }

  async searchResultsIsVisible() {
    expect(await this.requestSearchScreen).toBeDisplayed();
  }

  async closeQRPayment() {
    await Gestures.tap(this.closeRequestPaymentQRIcon);
  }
}

export default new RequestTokenScreen();
