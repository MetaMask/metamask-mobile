import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';
import {
  WHATS_NEW_MODAL_CLOSE_BUTTON_ID,
  WHATS_NEW_MODAL_CONTAINER_ID,
} from '../../../app/constants/test-ids';

class WhatsNewModal {
  get container() {
    return Selectors.getElementByPlatform(WHATS_NEW_MODAL_CONTAINER_ID);
  }

  get closeButton() {
    return Selectors.getElementByPlatform(WHATS_NEW_MODAL_CLOSE_BUTTON_ID);
  }

  async waitForDisplay() {
    const element = await this.container;
    await element.waitForDisplayed();
  }

  async waitForDisappear() {
    const element = await this.container;
    await element.waitForExist({ reverse: true });
  }

  async tapCloseButton() {
    await Gestures.waitAndTap(this.closeButton);
  }
}

export default new WhatsNewModal();
