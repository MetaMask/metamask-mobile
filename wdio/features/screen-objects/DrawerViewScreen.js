import Gestures from "../helpers/Gestures";
import Selectors from "../helpers/Selectors";
import {
  DRAWER_VIEW_LOCK_TEXT_ID,
  DRAWER_VIEW_BROWSER_TEXT
} from "../testIDs/Screens/DrawerView.testIds";

class DrawerViewScreen {

  get lockNavBarItem() {
    return Selectors.getElementByPlatform(DRAWER_VIEW_LOCK_TEXT_ID);
  }

  get browser() {
    return Selectors.getXpathElementByText(DRAWER_VIEW_BROWSER_TEXT)
  }

  async tapNavBarItemLock() {
    await Gestures.waitAndTap(this.lockNavBarItem)
  }

  async tapYesOnDeviceAlert() {
    await driver.acceptAlert();
  }

  async tapBrowserButton() {
    await Gestures.waitAndTap(this.browser);
  }
}

export default new DrawerViewScreen();
