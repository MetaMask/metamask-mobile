import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';

import {
  CANCEL_BUTTON_ON_BROWSER_ID,
  HOME_SUGGESTION,
  UNISWAP_SUGGESTION,
  URL_CLEAR_ICON,
  URL_INPUT_BOX_ID,
} from '../testIDs/BrowserScreen/AddressBar.testIds';

class AddressBarScreen {
  get urlCancelButton() {
    return Selectors.getElementByPlatform(CANCEL_BUTTON_ON_BROWSER_ID);
  }

  get urlModalInput() {
    return Selectors.getElementByPlatform(URL_INPUT_BOX_ID);
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
  }

  async isUrlValueContains(text) {
    await expect(this.urlModalInput).toHaveTextContaining(text);
  }

  async isUrlInputEmpty() {
    await expect(this.urlModalInput).toHaveText('Search or Type URL');
  }

  async tapClearButton() {
    await Gestures.waitAndTap(this.urlClearIcon);
  }

  async editUrlInput(text) {
    await Gestures.typeText(this.urlModalInput, text);
  }

  async tapUrlCancelButton() {
    await Gestures.waitAndTap(this.urlCancelButton);
    const element = await this.urlCancelButton;
    await element.waitForExist({ reverse: true });
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
