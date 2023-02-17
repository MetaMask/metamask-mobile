import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';

class SecurityAndPrivacyScreen {
  async tapChangePassword() {
    await Gestures.swipe({ x: 200, y: 1000 }, { x: 200, y: 200 });
    await Gestures.tapTextByXpath('Change password');
  }
  async isChangePasswordTextVisible(text) {
    const changepasswordText = Selectors.getXpathElementByText(text);
    await expect(changepasswordText).toBeDisplayed();
  }
}

export default new SecurityAndPrivacyScreen();
