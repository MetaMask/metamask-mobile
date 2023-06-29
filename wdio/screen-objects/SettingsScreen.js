import Selectors from '../helpers/Selectors';
import { LOCK_SETTINGS } from './testIDs/Screens/Settings.testIds';
import Gestures from '../helpers/Gestures';

class SettingsScreen {
  get lockOption() {
    return Selectors.getElementByPlatform(LOCK_SETTINGS);
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
