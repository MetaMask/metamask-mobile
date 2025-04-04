import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import { ChoosePasswordSelectorsIDs } from '../../../e2e/selectors/Onboarding/ChoosePassword.selectors';

class SkipAccountSecurityModal {
  get skipBackupText() {
    return Selectors.getXpathElementByResourceId(
      ChoosePasswordSelectorsIDs.ANDROID_I_UNDERSTAND_BUTTON_ID,
    );
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
