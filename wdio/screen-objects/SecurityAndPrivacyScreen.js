import Gestures from '../helpers/Gestures';

class SecurityAndPrivacyScreen {
  async tapChangePassword() {
    await Gestures.swipe({ x: 200, y: 1000 }, { x: 200, y: 200 });
    await Gestures.tapTextByXpath('Change password');
  }
}

export default new SecurityAndPrivacyScreen();
