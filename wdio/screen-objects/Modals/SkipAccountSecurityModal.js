import {
  ANDROID_I_UNDERSTAND_BUTTON_ID,
  SKIP_BUTTON,
} from '../testIDs/Components/SkipAccountSecurityModalTestIds.js';
import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';

class SkipAccountSecurityModal {
  get skipBackupText() {
    return Selectors.getXpathElementByResourceId(
      ANDROID_I_UNDERSTAND_BUTTON_ID,
    );
  }

  get skipButton() {
    return Selectors.getElementByPlatform(SKIP_BUTTON);
  }

  async proceedWithoutWalletSecure() {
    const setTimeout = 2000;
    await driver.pause(setTimeout);
    await Gestures.waitAndTap(this.skipBackupText);
    await Gestures.tapTextByXpath('Skip');
  }

  async isVisible() {
    await expect(this.skipBackupText).toBeDisplayed();
  }
}

export default new SkipAccountSecurityModal();
