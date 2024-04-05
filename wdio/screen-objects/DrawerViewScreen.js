import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  DRAWER_VIEW_BROWSER_TEXT_ID,
  DRAWER_VIEW_LOCK_TEXT_ID,
  DRAWER_VIEW_WALLET_TEXT_ID,
} from './testIDs/Screens/DrawerView.testIds';

class DrawerViewScreen {
  get lockNavBarItem() {
    return Selectors.getElementByPlatform(DRAWER_VIEW_LOCK_TEXT_ID);
  }

  get browserButton() {
    return Selectors.getElementByPlatform(DRAWER_VIEW_BROWSER_TEXT_ID);
  }

  get walletButton() {
    return Selectors.getElementByPlatform(DRAWER_VIEW_WALLET_TEXT_ID);
  }

  async tapNavBarItemLock() {
    await Gestures.waitAndTap(this.lockNavBarItem);
  }

  async tapYesOnDeviceAlert() {
    await driver.acceptAlert();
  }

  async tapBrowserButton() {
    await Gestures.waitAndTap(this.browserButton);
  }

  async tapWalletButton() {
    await Gestures.waitAndTap(this.walletButton);
  }
}

export default new DrawerViewScreen();
