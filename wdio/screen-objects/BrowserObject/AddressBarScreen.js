import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';

import {
 
  HOME_SUGGESTION,
  UNISWAP_SUGGESTION,

} from '../testIDs/BrowserScreen/AddressBar.testIds';

import  {
  BrowserViewSelectorsIDs,

} from '../../../e2e/selectors/Browser/BrowserView.selectors';
import { BrowserURLBarSelectorsIDs } from '../../../e2e/selectors/Browser/BrowserURLBar.selectors';

class AddressBarScreen {
  get urlCancelButton() {
    return Selectors.getXpathElementByResourceId(BrowserViewSelectorsIDs.CANCEL_BUTTON_ON_BROWSER_ID);
  }

  get urlModalInput() {
    return Selectors.getXpathElementByResourceId(BrowserURLBarSelectorsIDs.URL_INPUT);
  }

  get uniswapSuggestionsButton() {
    return Selectors.getXpathElementByText(UNISWAP_SUGGESTION);
  }

  get homeSuggestionsButton() {
    return Selectors.getXpathElementByText(HOME_SUGGESTION);
  }

  get urlClearIcon() {
    return Selectors.getXpathElementByResourceId(BrowserViewSelectorsIDs.URL_CLEAR_ICON);
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
