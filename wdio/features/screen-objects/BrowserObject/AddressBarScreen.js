import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';

import {
  CANCEL_BUTTON,
  EMPOWR_SUGGESTION,
  HOME_SUGGESTION,
  MODAL_INPUT,
  REDDIT_SUGGESTION,
  UNISWAP_SUGGESTION,
  URL_CLEAR_ICON,
} from '../../testIDs/BrowserScreen/AddressBar.testIds';
import { ROOT_CONTENT_ID } from '../../testIDs/BrowserScreen/BrowserScreen.testIds';

class AddressBarScreen {
  get urlCancelButton() {
    return Selectors.getXpathElementByResourceId(CANCEL_BUTTON);
  }

  get urlModalInput() {
    return Selectors.getXpathElementByResourceId(MODAL_INPUT);
  }

  get uniswapSuggestionsButton() {
    return Selectors.getXpathElementByText(UNISWAP_SUGGESTION);
  }

  get homeSuggestionsButton() {
    return Selectors.getXpathElementByText(HOME_SUGGESTION);
  }

  get empowrSuggestionsButton() {
    return Selectors.getXpathElementByText(EMPOWR_SUGGESTION);
  }

  get redditSuggestionOption() {
    return Selectors.getXpathElementByText(REDDIT_SUGGESTION);
  }

  get root() {
    return Selectors.getXpathElementByResourceId(ROOT_CONTENT_ID);
  }

  get urlClearIcon() {
    return Selectors.getElementByPlatform(URL_CLEAR_ICON);
  }

  async isAddressInputViewDisplayed() {
    await expect(await this.urlModalInput).toBeDisplayed();
  }

  async isAddressInputViewNotDisplayed() {
    await expect(await this.urlModalInput).not.toBeDisplayed();
  }

  async isUrlValueContains(text) {
    const textFromElement = await this.urlModalInput;
    const urlValue = await textFromElement.getText();
    await expect(urlValue).toContain(text);
  }

  async isUrlInputEmpty() {
    const textFromElement = await this.urlModalInput;
    const urlValue = await textFromElement.getText();
    await expect(urlValue).toEqual('');
  }

  async tapClearButton() {
    await Gestures.tap(this.urlClearIcon);
  }

  async editUrlInput(text) {
    await Gestures.typeText(this.urlModalInput, text);
  }

  async tapUrlCancelButton() {
    await Gestures.tap(this.urlCancelButton);
  }

  async isUniswapSuggestionDisplayed() {
    await expect(await this.uniswapSuggestionsButton).toBeDisplayed();
  }

  async tapUniswapSuggestionButton() {
    await Gestures.tap(this.uniswapSuggestionsButton);
  }

  async tapEmpowrSuggestionButton() {
    await Gestures.tap(this.empowrSuggestionsButton);
  }

  async tapHomeSuggestionButton() {
    await Gestures.tap(this.homeSuggestionsButton);
  }

  async tapRedditSuggestion() {
    await Gestures.tap(this.redditSuggestionOption);
  }
}

export default new AddressBarScreen();
