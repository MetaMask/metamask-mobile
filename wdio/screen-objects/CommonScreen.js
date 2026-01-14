import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures';
import {
  ToastSelectorsIDs,
  ToastSelectorsText,
} from '../../app/component-library/components/Toast/ToastModal.testIds';
import { CommonSelectorsIDs } from '../../app/util/Common.testIds';
import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';

class CommonScreen {

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get toast() {
    return Selectors.getXpathElementByResourceId(ToastSelectorsIDs.CONTAINER);
  }

  get androidProgressBar() {
    return Selectors.getElementByCss(CommonSelectorsIDs.ANDROID_PROGRESS_BAR);
  }

  get TokenNotificationTitle() {
    return Selectors.getElementByPlatform(ToastSelectorsIDs.NOTIFICATION_TITLE);
  }

  get toastCloseButton() {
    return Selectors.getXpathElementByText(ToastSelectorsText.CLOSE_BUTTON);
  }

  async waitForToastToDisplay() {
    const element = await this.toast;
    await element.waitForExist();
  }

  async tapToastCloseButton() {
    await Gestures.waitAndTap(this.toastCloseButton);
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

  async longTapOnText(text) {
    // Taps only specified text
    await Gestures.tapTextByXpath(text, 'LONGPRESS');
  }

  async checkNoNotification() {
    const notification = await this.TokenNotificationTitle;
    await notification.waitForExist({ reverse: true });
  }


  async tapOnAsset(asset) {
    if (!this._device) {
      await Gestures.getElementByResourceId(`asset-${asset}`);
    } else {
      console.log('tapOnAsset ->', this._device);
      const assetElement = await AppwrightSelectors.getElementByID(this._device, `asset-${asset}`);
      await assetElement.tap();
    }
  }
}

export default new CommonScreen();
