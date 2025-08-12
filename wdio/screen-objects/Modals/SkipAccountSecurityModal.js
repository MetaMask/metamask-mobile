import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import { ChoosePasswordSelectorsIDs } from '../../../e2e/selectors/Onboarding/ChoosePassword.selectors';
import AppwrightSelectors from '../../helpers/AppwrightSelectors';
import { SkipAccountSecurityModalSelectorsIDs } from '../../../e2e/selectors/Onboarding/SkipAccountSecurityModal.selectors';

class SkipAccountSecurityModal {

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }
  get skipBackupText() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        SkipAccountSecurityModalSelectorsIDs.ANDROID_SKIP_BACKUP_BUTTON_ID,
      );
    } else {
      return AppwrightSelectors.getElementByID(this._device, SkipAccountSecurityModalSelectorsIDs.ANDROID_SKIP_BACKUP_BUTTON_ID);
    }
  }

  async proceedWithoutWalletSecure() {
    if (!this._device) {
    const setTimeout = 2000;
    await driver.pause(setTimeout);
    await Gestures.waitAndTap(this.skipBackupText);
    await Gestures.tapTextByXpath('Skip');
    } else {
      const button = await this.skipBackupText;
      await button.tap();
      const skipButton = await AppwrightSelectors.getElementByID(this._device, 'Skip-button');
      await skipButton.tap();
    }
  }

  async isVisible() {
    await expect(this.skipBackupText).toBeDisplayed();
  }
}

export default new SkipAccountSecurityModal();
