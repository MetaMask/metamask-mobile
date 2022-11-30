import Gestures from "../helpers/Gestures";
import Selectors from "../helpers/Selectors";

import {
  BROWSER_NAVBAR_TITLE_NETWORK,
  BROWSER_SCREEN_ID,
  BROWSER_URL_MODAL_ID,
  BROWSER_URL_MODAL_INPUT
} from "../testIDs/Screens/BrowserScreen.testIds";

class BrowserScreen {
  get screen() {
    return Selectors.getXpathElementByText(BROWSER_SCREEN_ID);
  }

  get navBarTitle() {
    return Selectors.getXpathElementByText(BROWSER_NAVBAR_TITLE_NETWORK);
  }

  get urlModal() {
    return Selectors.getXpathElementByText(BROWSER_URL_MODAL_ID);
  }

  get urlModalInput() {
    return Selectors.getXpathElementByText(BROWSER_URL_MODAL_INPUT);
  }

  async isScreenContentDisplayed() {
    await expect(this.screen).toBeDisplayed();
  }

  async tapNavBar() {
    return Gestures.tap(this.navBarTitle);
  }

  async isUrlModalDisplayed() {
    await expect(this.urlModal).toBeDisplayed();
  }
  
  async getUrlModalInputValue() {
    return await this.urlModalInput.getText();
  }
}

export default new BrowserScreen();
