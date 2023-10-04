import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  ENABLE_AUTOMATIC_SECURITY_CHECK_NO_THANKS_BUTTON_ID,
  ENABLE_AUTOMATIC_SECURITY_CHECK_CONTAINER_ID,
} from './testIDs/Screens/EnableAutomaticSecurityChecksScreen.testIds';

class EnableAutomaticSecurityChecksScreen {
  get noThanksButton() {
    return Selectors.getXpathElementByResourceId(
      ENABLE_AUTOMATIC_SECURITY_CHECK_NO_THANKS_BUTTON_ID,
    );
  }
  get enableAutomaticSecurityChecksScreen() {
    return Selectors.getElementByPlatform(
      ENABLE_AUTOMATIC_SECURITY_CHECK_CONTAINER_ID,
    );
  }

  async tapNoThanksButton() {
    const element = await this.noThanksButton;
    await element.waitForExist({ timeout: 100000 });
    await Gestures.waitAndTap(this.noThanksButton);
  }

  async isVisible() {
    await expect(this.enableAutomaticSecurityChecksScreen).toBeDisplayed();
  }
  async notVisible() {
    await expect(this.enableAutomaticSecurityChecksScreen).not.toBeDisplayed();
  }
}
export default new EnableAutomaticSecurityChecksScreen();
