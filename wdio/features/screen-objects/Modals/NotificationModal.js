import Selectors from '../../helpers/Selectors';
import { NOTIFICATION_TITLE } from '../testIDs/Components/Notification.testIds';

class NotificationModal {
  get title() {
    return Selectors.getElementByPlatform(NOTIFICATION_TITLE);
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
