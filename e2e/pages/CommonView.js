import Matchers from '../framework/Matchers.ts';
import Gestures from '../framework/Gestures.ts';
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

  get errorMessage() {
    return Matchers.getElementByID(CommonSelectorsIDs.ERROR_MESSAGE);
  }

  get okAlertButton() {
    return Matchers.getElementByText(CommonSelectorsText.OK_ALERT_BUTTON);
  }

  async tapBackButton() {
    await Gestures.waitAndTap(this.backButton);
  }

  async tapOkAlert() {
    await Gestures.waitAndTap(this.okAlertByText);
  }

  async tapOKAlertButton() {
    await Gestures.waitAndTap(this.okAlertButton);
  }
}

export default new CommonView();
