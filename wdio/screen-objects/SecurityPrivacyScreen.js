import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures';
import {SECURITY_PRIVACY_REMEMBER_ME_TOGGLE, SECURITY_PRIVACY_VIEW_ID} from './testIDs/Screens/SecurityPrivacy.testIds';

class SecurityPrivacyScreen {
  get rememberMeToggle() {
    return Selectors.getElementByPlatform(SECURITY_PRIVACY_REMEMBER_ME_TOGGLE);
  }

  get container () {
    return Selectors.getElementByPlatform(SECURITY_PRIVACY_VIEW_ID);
  }

  async tapRememberToggle() {
    const element = await this.rememberMeToggle;
    while (!(await element.isDisplayed())) {
      await Gestures.swipeUp();
    }

    await Gestures.waitAndTap(element);
  }

  async tapToskipVideo() {
    await this.isScreenDisplayed();
    await driver.pause(1000);
    await Gestures.tapByCoordinatesPercentage(12.3, 48);
    await driver.pause(1000);
    await Gestures.tapByCoordinatesPercentage(12.3, 48);
  }
  
  async isRememberMeToggle(value) {
    const element = await this.rememberMeToggle;
    await expect(await element.getText()).toEqual(value);
  }

  async isScreenDisplayed() {
    const element = await this.container;
    await element.waitForDisplayed({ interval: 1000});
  }
}

export default new SecurityPrivacyScreen();
