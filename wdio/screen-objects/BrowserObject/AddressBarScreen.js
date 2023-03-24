/* global driver */
import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';

import {
  CANCEL_BUTTON,
  HOME_SUGGESTION,
  MODAL_INPUT,
  UNISWAP_SUGGESTION,
  URL_CLEAR_ICON,
} from '../testIDs/BrowserScreen/AddressBar.testIds';

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

  get urlClearIcon() {
    return Selectors.getElementByPlatform(URL_CLEAR_ICON);
  }

  async isAddressInputViewDisplayed() {
    await expect(await this.urlModalInput).toBeDisplayed();
  }

  async isAddressInputViewNotDisplayed() {
    await expect(await this.urlModalInput).not.toBeDisplayed();
  }

  async submitUrlWebsite() {
    await driver.pressKeyCode(66);
    await driver.pause(500);
    const element = await this.urlCancelButton;
    const isCancelButtonDisplayed = await element.isDisplayed();

    if (isCancelButtonDisplayed) {
      await Gestures.waitAndTap(this.urlCancelButton);
    }
  }

  async isUrlValueContains(text) {
    const textFromElement = await this.urlModalInput;
    const urlValue = await textFromElement.getText();
    await expect(urlValue).toContain(text);
  }

  async isUrlInputEmpty() {
    const textFromElement = await this.urlModalInput;
    const urlValue = await textFromElement.getText();
    await expect(urlValue).toEqual('Search or Type URL');
  }

  async tapClearButton() {
    await Gestures.waitAndTap(this.urlClearIcon);
  }

  async editUrlInput(text) {
    await Gestures.typeText(this.urlModalInput, text);
  }

  async tapUrlCancelButton() {
    await Gestures.waitAndTap(this.urlCancelButton);
  }

  async isUniswapSuggestionDisplayed() {
    await expect(await this.uniswapSuggestionsButton).toBeDisplayed();
  }

  async tapUniswapSuggestionButton() {
    await Gestures.waitAndTap(this.uniswapSuggestionsButton);
  }

  async tapHomeSuggestionButton() {
    await Gestures.waitAndTap(this.homeSuggestionsButton);
  }
}

export default new AddressBarScreen();
