import {
  SKIP_BACKUP_TEXT,
  SKIP_BUTTON,
} from '../testIDs/Screens/WalletSetupScreen.testIds';
import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';

class SkipAccountSecurityModal {
  get skipBackupText() {
    return Selectors.getXpathElementByResourceId(SKIP_BACKUP_TEXT);
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
