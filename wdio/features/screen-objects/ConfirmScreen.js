import Gestures from '../helpers/Gestures';

class ConfirmScreen {
  async tapSendButton() {
    await Gestures.tapTextByXpath('Send');
  }
}
export default new ConfirmScreen();
