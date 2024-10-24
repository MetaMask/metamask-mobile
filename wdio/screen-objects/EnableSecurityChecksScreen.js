import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import { EnableAutomaticSecurityChecksIDs } from '../../e2e/selectors/Modals/EnableAutomaticSecurityChecks.selectors';

class EnableAutomaticSecurityChecksScreen {
  get noThanksButton() {
    return Selectors.getXpathElementByResourceId(
      EnableAutomaticSecurityChecksIDs.NO_THANKS_BUTTON,
    );
  }
  get enableAutomaticSecurityChecksScreen() {
    return Selectors.getElementByPlatform(
      EnableAutomaticSecurityChecksIDs.CONTAINER,
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
