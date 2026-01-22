import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';

import {

  HOME_SUGGESTION,
  UNISWAP_SUGGESTION,

} from '../testIDs/BrowserScreen/AddressBar.testIds';

import { BrowserURLBarSelectorsIDs } from '../../../app/components/UI/BrowserUrlBar/BrowserURLBar.testIds';
import AppwrightSelectors from '../../../e2e/framework/AppwrightSelectors';

class AddressBarScreen {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get urlCancelButton() {
    return Selectors.getXpathElementByResourceId(BrowserURLBarSelectorsIDs.CANCEL_BUTTON_ON_BROWSER_ID);
  }

  get urlModalInput() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(BrowserURLBarSelectorsIDs.URL_INPUT);
    } else {
      return AppwrightSelectors.getElementByID(this._device, BrowserURLBarSelectorsIDs.URL_INPUT);
    }
  }

  get uniswapSuggestionsButton() {
    return Selectors.getXpathElementByText(UNISWAP_SUGGESTION);
  }

  get homeSuggestionsButton() {
    return Selectors.getXpathElementByText(HOME_SUGGESTION);
  }

  get urlClearIcon() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(BrowserURLBarSelectorsIDs.URL_CLEAR_ICON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, BrowserURLBarSelectorsIDs.URL_CLEAR_ICON);
    }
  }

  async isAddressInputViewDisplayed() {
    await expect(await this.urlModalInput).toBeDisplayed();
  }

  async isAddressInputViewNotDisplayed() {
    await expect(await this.urlModalInput).not.toBeDisplayed();
  }

  async submitUrlWebsite() {
    if (!this._device) {
      await driver.pressKeyCode(66);
    } else {
      const driver = await this._device.webDriverClient;
      await driver.pressKeyCode(66);
    }
  }

  async isUrlValueContains(text) {
    await expect(this.urlModalInput).toHaveTextContaining(text);
  }

  async isUrlInputEmpty() {
    await expect(this.urlModalInput).toHaveText('Search or Type URL');
  }

  async tapClearButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.urlClearIcon);
    } else {
      const urlClearIcon = await this.urlClearIcon;
      await urlClearIcon.tap();
    }
  }

  async editUrlInput(text) {
    if (!this._device) {
      await Gestures.typeText(this.urlModalInput, text);
    } else {
      const urlModalInput = await this.urlModalInput;
      await urlModalInput.fill(text);
    }
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