import Matchers from '../utils/Matchers';
import Gestures from '../utils/Gestures';
import {
  CommonSelectorsIDs,
  CommonSelectorsText,
} from '../selectors/Common.selectors';

class CommonView {
  get okAlertByText() {
    return Matchers.getElementByText('OK');
  }

  get backButton() {
    return Matchers.getElementByID(CommonSelectorsIDs.BACK_ARROW_BUTTON);
  }

  get toast() {
    return Matchers.getElementByID(CommonSelectorsIDs.TOAST_NOTIFICATION_TITLE);
  }

  get errorMessage() {
    return Matchers.getElementByID(CommonSelectorsIDs.ERROR_MESSAGE);
  }
  async tapBackButton() {
    await Gestures.waitAndTap(this.backButton);
  }

  async tapOkAlert() {
    await Gestures.waitAndTap(this.okAlertByText);
  }

  async accountNameInToast(accountName) {
    const connectedAccountMessage = `${accountName} ${CommonSelectorsText.TOAST_CONNECTED_ACCOUNTS}`;
  } // Circle back here
}

export default new CommonView();
