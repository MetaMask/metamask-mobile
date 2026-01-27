import Selectors from '../helpers/Selectors';
import { LOCK_SETTINGS } from './testIDs/Screens/Settings.testIds';
import Gestures from '../helpers/Gestures';
import { SettingsViewSelectorsIDs } from '../../app/components/Views/Settings/SettingsView.testIds';

class SettingsScreen {
  get lockOption() {
    return Selectors.getElementByPlatform(LOCK_SETTINGS);
  }

  get generalSettings() {
    return Selectors.getXpathElementByResourceId(
      SettingsViewSelectorsIDs.GENERAL,
    );
  }

  async waitForDisplay() {
    const element = await this.generalSettings;
    await element.waitForDisplayed();
  }

  async tapLockOption() {
    const lockOption = await this.lockOption;
    while (!(await lockOption.isDisplayed())) {
      await Gestures.swipeUp();
    }

    await Gestures.waitAndTap(lockOption);
  }
}

export default new SettingsScreen();
