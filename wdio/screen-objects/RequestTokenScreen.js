import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures';
import { RequestPaymentViewSelectors } from '../../app/components/UI/ReceiveRequest/RequestPaymentView.testIds';

class RequestTokenScreen {
  get requestAmount() {
    return Selectors.getElementByPlatform(RequestPaymentViewSelectors.REQUEST_AMOUNT_INPUT_BOX_ID);
  }

  get requestSearchInput() {
    return Selectors.getElementByPlatform(RequestPaymentViewSelectors.TOKEN_SEARCH_INPUT_BOX);
  }

  get requestSearchBackButton() {
    return Selectors.getElementByPlatform(RequestPaymentViewSelectors.BACK_BUTTON_ID);
  }

  get requestSearchScreen() {
    return Selectors.getElementByPlatform(RequestPaymentViewSelectors.REQUEST_PAYMENT_CONTAINER_ID);
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

  async inputSearchRequestField(searchRequest) {
    await Gestures.typeText(this.requestSearchInput, searchRequest);
  }

  async tapBackButtonOnSearch() {
    await Gestures.tap(this.requestSearchBackButton);
  }

  async searchResultsIsVisible() {
    expect(await this.requestSearchScreen).toBeDisplayed();
  }
}

export default new RequestTokenScreen();
