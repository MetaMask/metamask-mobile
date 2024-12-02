import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import { EnableAutomaticSecurityChecksIDs } from '../../e2e/selectors/Onboarding/EnableAutomaticSecurityChecks.selectors';

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
}
export default new EnableAutomaticSecurityChecksScreen();
