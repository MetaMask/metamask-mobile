import Matchers from '../utils/Matchers';
import Gestures from '../utils/Gestures';

export default class CommonView {
  static get okAlertByText() {
    return Matchers.getElementByText('OK');
  }

  static get okAlertByLabel() {
    return Matchers.getElementByText('OK');
  }

  static async tapOkAlert() {
    if (device.getPlatform() === 'android') {
      await Gestures.tap(this.okAlertByText);
    }

    await Gestures.tap(this.okAlertByLabel);
  }
}
