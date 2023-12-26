import Matchers from '../utils/Matchers';
import Gestures from '../utils/Gestures';
import { CommonSelectorsIDs } from '../selectors/Common.selectors';

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

  async tapBackButton() {
    await Gestures.waitAndTap(this.backButton);
  }

  async tapOkAlert() {
    await Gestures.waitAndTap(this.okAlertByText);
  }
}

export default new CommonView();
