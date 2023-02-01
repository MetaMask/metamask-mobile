/* global driver */
import {
  SKIP_BACKUP_TEXT,
  SKIP_BUTTON,
} from '../testIDs/Screens/WalletSetupScreen.testIds';
import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';

class SkipAccountSecurityModal {
  get skipBackupText() {
    return Selectors.getElementByPlatform(SKIP_BACKUP_TEXT);
  }

  get skipButton() {
    return Selectors.getElementByPlatform(SKIP_BUTTON);
  }

  async proceedWithoutWalletSecure() {
    const settimeout = 2000;
    await driver.pause(settimeout);
    await Gestures.tap(this.skipBackupText);
    await Gestures.tap(this.skipButton);
  }

  async isVisible() {
    await expect(this.skipBackupText).toBeDisplayed();
  }
}
export default new SkipAccountSecurityModal();
