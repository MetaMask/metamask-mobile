import Matchers from '../utils/Matchers';
import Gestures from '../utils/Gestures';

class CommonView {
  get okAlertByText() {
    return Matchers.getElementByText('OK');
  }

  get okAlertByLabel() {
    return Matchers.getElementByLabel('OK');
  }

  async tapOkAlert() {
    if (device.getPlatform() === 'android') {
      await Gestures.waitAndTap(this.okAlertByText);
    } else {
      await Gestures.waitAndTap(this.okAlertByLabel);
    }
  }
}

export default new CommonView();
