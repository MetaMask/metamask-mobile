import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures';
import {
  REQUEST_AMOUNT_INPUT,
  REQUEST_SEARCH_ASSET_INPUT,
  REQUEST_SEARCH_RESULTS_BACK_BUTTON,
  REQUEST_SEARCH_SCREEN,
} from './testIDs/Screens/RequestToken.testIds';

class RequestTokenScreen {
  get requestAmount() {
    return Selectors.getElementByPlatform(REQUEST_AMOUNT_INPUT);
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
