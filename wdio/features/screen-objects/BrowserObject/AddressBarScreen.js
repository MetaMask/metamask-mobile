import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';

import {
  CANCEL_BUTTON,
  EMPOWR_SUGGESTION,
  HOME_SUGGESTION,
  MODAL_INPUT,
  REDDIT_SUGGESTION,
  SUSHISWAP_SUGGESTION,
  URL_CLEAR_ICON,
} from 'wdio/features/testIDs/BrowserScreen/AddressBar.testIds';
import { ROOT_CONTENT_ID } from 'wdio/features/testIDs/BrowserScreen/BrowserScreen.testIds';

class AddressBarScreen {
  get urlCancelButton() {
    return Selectors.getXpathElementByResourceId(CANCEL_BUTTON);
  }

  get urlModalInput() {
    return Selectors.getXpathElementByText(MODAL_INPUT);
  }

  get sushiSuggestionsButton() {
    return Selectors.getXpathElementByText(SUSHISWAP_SUGGESTION);
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
    return Selectors.getXpathElementByResourceId(URL_CLEAR_ICON);
  }

  async isAddressInputViewDisplayed() {
    await expect(this.urlModalInput).toBeDisplayed();
  }

  async isAddressInputViewNotDisplayed() {
    await expect(this.urlModalInput).not.toBeDisplayed();
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
    await Gestures.waitAndTap(this.urlClearIcon);
  }

  async editUrlInput(text) {
    await Gestures.typeText(this.urlModalInput, text);
  }

  async enterUrlValue() {
    await Gestures.submitText(this.urlModalInput);
  }

  async tapUrlCancelButton() {
    await Gestures.waitAndTap(this.urlCancelButton);
  }

  async isSushiSuggestionDisplayed() {
    await expect(this.sushiSuggestionsButton).toBeDisplayed();
  }

  async tapSushiSuggestionButton() {
    await Gestures.waitAndTap(this.sushiSuggestionsButton);
  }

  async tapEmpowrSuggestionButton() {
    await Gestures.waitAndTap(this.empowrSuggestionsButton);
  }

  async tapHomeSuggestionButton() {
    await Gestures.waitAndTap(this.homeSuggestionsButton);
  }

  async tapRedditSuggestion() {
    await Gestures.waitAndTap(this.redditSuggestionOption);
  }
}

export default new AddressBarScreen();
