import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import { ChoosePasswordSelectorsIDs } from '../../../app/components/Views/ChoosePassword/ChoosePassword.testIds';
import AppwrightSelectors from '../../../tests/framework/AppwrightSelectors';
import { SkipAccountSecurityModalSelectorsIDs } from '../../../app/components/UI/SkipAccountSecurityModal/SkipAccountSecurityModal.testIds';
import { expect as appwrightExpect } from 'appwright';

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
    const element = await this.skipBackupText;
    await appwrightExpect(element).toBeVisible({ timeout: 10000 });
  }
}

export default new SkipAccountSecurityModal();
