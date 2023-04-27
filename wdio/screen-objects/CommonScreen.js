import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures';
import { ANDROID_PROGRESS_BAR, TOAST_ID } from './testIDs/Common.testIds';

class CommonScreen {
  get toast() {
    return Selectors.getElementByPlatform(TOAST_ID);
  }

  get androidProgressBar() {
    return Selectors.getElementByCss(ANDROID_PROGRESS_BAR);
  }

  async waitForToastToDisplay() {
    const element = await this.toast;
    await element.waitForExist();
  }

  async waitForToastToDisappear() {
    const element = await this.toast;
    await element.waitForExist({ reverse: true });
  }

  async waitForProgressBarToDisplay() {
    const element = await this.androidProgressBar;
    await element.waitForExist();
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
