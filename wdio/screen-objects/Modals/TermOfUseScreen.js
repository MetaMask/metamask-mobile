import Selectors from '../../helpers/Selectors';
import {
  TERMS_OF_USE_ACCEPT_BUTTON_ID,
  TERMS_OF_USE_CHECKBOX_ICON_ID,
  TERMS_OF_USE_SCREEN_ID,
  TERMS_OF_USE_SCROLL_END_ARROW_BUTTON_ID,
  TERMS_OF_USE_WEBVIEW_ID,
} from '../testIDs/Components/TermsOfUse.testIds';
import Gestures from '../../helpers/Gestures';

class TermOfUseScreen {
  get container() {
    return Selectors.getElementByPlatform(TERMS_OF_USE_SCREEN_ID);
  }

  get checkbox() {
    return Selectors.getElementByPlatform(TERMS_OF_USE_CHECKBOX_ICON_ID);
  }

  get scrollEndArrowButton() {
    return Selectors.getElementByPlatform(
      TERMS_OF_USE_SCROLL_END_ARROW_BUTTON_ID,
    );
  }

  get acceptButton() {
    return Selectors.getElementByPlatform(TERMS_OF_USE_ACCEPT_BUTTON_ID);
  }

  get webview() {
    return Selectors.getElementByPlatform(TERMS_OF_USE_WEBVIEW_ID);
  }

  async isDisplayed() {
    const container = await this.container;
    await container.waitForDisplayed();
  }

  async isNotDisplayed() {
    const container = await this.container;
    await container.waitForExist({ reverse: true});
  }

  async tapAgreeCheckBox() {
    await Gestures.waitAndTap(this.checkbox);
  }

  async tapScrollEndButton() {
    await driver.pause(500);
    await Gestures.swipeUp(0.5);
    await Gestures.tap(this.scrollEndArrowButton);
    await driver.pause(500);
  }

  async tapAcceptButton() {
    await Gestures.tap(this.acceptButton);
  }
}

export default new TermOfUseScreen();
