import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures';
import {
  ANDROID_PROGRESS_BAR,
  CELL_TITLE_TEST_ID,
  TOAST_ID,
} from './testIDs/Common.testIds';

class CommonScreen {
  get toast() {
    return Selectors.getElementByPlatform(TOAST_ID);
  }

  get androidProgressBar() {
    return Selectors.getElementByCss(ANDROID_PROGRESS_BAR);
  }

  get cellTitle() {
    return Selectors.getElementsByPlatform(CELL_TITLE_TEST_ID);
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

  async isNewCellCreated() {
    await expect(await this.cellTitle).toBeElementsArrayOfSize(2);
  }

  async tapCellTitle(account) {
    const elements = await this.cellTitle;

    for (const element of elements) {
      if ((await element.getText()) === account) {
        await Gestures.waitAndTap(element);
      }
    }
  }

  async longPressOnCellTitle(account) {
    const elements = await this.cellTitle;

    for (const element of elements) {
      if ((await element.getText()) === account) {
        await Gestures.longPress(element, 3000);
      }
    }
  }
}

export default new CommonScreen();
