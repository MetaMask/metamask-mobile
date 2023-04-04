import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures';
import { TOAST_ID } from './testIDs/Common.testIds';

class CommonScreen {
  get toast() {
    return Selectors.getElementByPlatform(TOAST_ID);
  }

  async waitForToastToDisplay() {
    const element = await this.toast;
    await element.waitForExist();
  }

  async waitForToastToDisappear() {
    const element = await this.toast;
    await element.waitForExist({ reverse: true });
  }

  async isTextDisplayed(text) {
    await expect(Selectors.getXpathElementByText(text)).toBeDisplayed();
  }

  async isTextElementNotDisplayed(text) {
    await expect(Selectors.getXpathElementByText(text)).not.toBeDisplayed();
  }

  async tapOnText(text) {
    // Taps only specified text
    await Gestures.tapTextByXpath(text);
  }

  async tapTextContains(text) {
    // Taps text that contains the string
    await Gestures.tapByTextContaining(text);
  }
}

export default new CommonScreen();
