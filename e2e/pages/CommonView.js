import Matchers from '../utils/Matchers';
import Gestures from '../utils/Gestures';

class CommonView {
  get okAlertByText() {
    return Matchers.getElementByText('OK');
  }

  async tapOkAlert() {
    await Gestures.waitAndTap(this.okAlertByText);
  }
}

export default new CommonView();
