import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  DRAWER_VIEW_LOCK_TEXT_ID,
  DRAWER_VIEW_BROWSER_TEXT_ID,
  DRAWER_VIEW_WALLET_TEXT_ID,
} from '../testIDs/Screens/DrawerView.testIds';
import { driver } from '@wdio/appium-service';

class DrawerViewScreen {
  get lockNavBarItem() {
    return Selectors.getElementByPlatform(DRAWER_VIEW_LOCK_TEXT_ID);
  }

  get browser() {
    return Selectors.getXpathElementByText(DRAWER_VIEW_BROWSER_TEXT_ID);
  }

  get walletButton() {
    return Selectors.getXpathElementByText(DRAWER_VIEW_WALLET_TEXT_ID);
  }

  async tapNavBarItemLock() {
    await Gestures.waitAndTap(this.lockNavBarItem);
  }

  async tapYesOnDeviceAlert() {
    await driver.acceptAlert();
  }

  async tapBrowserButton() {
    await Gestures.waitAndTap(this.browser);
  }

  async tapWalletButton() {
    await Gestures.waitAndTap(this.walletButton);
  }
}

export default new DrawerViewScreen();
