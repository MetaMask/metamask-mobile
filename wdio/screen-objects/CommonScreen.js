import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures';
<<<<<<< HEAD
import { ANDROID_PROGRESS_BAR, TOAST_ID } from './testIDs/Common.testIds';
=======
import {
  ToastSelectorsIDs,
  ToastSelectorsText,
} from '../../e2e/selectors/Modals/ToastModal.selectors';
import { CommonSelectorsIDs } from '../../e2e/selectors/Common.selectors';
>>>>>>> ca52e90402 (test: Add step to close onboarding modals (#10387))
import { NOTIFICATION_TITLE } from './testIDs/Components/Notification.testIds';

class CommonScreen {
  get toast() {
    return Selectors.getXpathElementByResourceId(TOAST_ID);
  }

  get androidProgressBar() {
    return Selectors.getElementByCss(ANDROID_PROGRESS_BAR);
  }

  get TokenNotificationTitle() {
    return Selectors.getElementByPlatform(NOTIFICATION_TITLE);
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
}

export default new CommonScreen();
