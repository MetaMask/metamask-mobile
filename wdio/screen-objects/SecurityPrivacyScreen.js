import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures';
import { SECURITY_PRIVACY_REMEMBER_ME_TOGGLE } from './testIDs/Screens/SecurityPrivacy.testIds';

class SecurityPrivacyScreen {
  get rememberMeToggle() {
    return Selectors.getElementByPlatform(SECURITY_PRIVACY_REMEMBER_ME_TOGGLE);
  }

  async tapRememberToggle() {
    await Gestures.checkIfDisplayedWithSwipeUp(this.rememberMeToggle, 10);
    await Gestures.waitAndTap(this.rememberMeToggle);
  }

  async isRememberMeToggle(value) {
    const element = await this.rememberMeToggle;
    await expect(await element.getText()).toEqual(value);
  }
}

export default new SecurityPrivacyScreen();
