import Selectors from '../../helpers/Selectors';
import { ToastSelectorsIDs } from '../../../app/component-library/components/Toast/ToastModal.testIds';

class NotificationModal {
  get title() {
    return Selectors.getElementByPlatform(ToastSelectorsIDs.NOTIFICATION_TITLE);
  }

  async waitForDisplay() {
    const element = await this.title;
    await element.waitForDisplayed();
  }

  async waitForDisappear() {
    const element = await this.title;
    await element.waitForExist({ reverse: true });
  }
}

export default new NotificationModal();
