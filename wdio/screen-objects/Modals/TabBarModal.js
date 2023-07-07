import Selectors from '../../helpers/Selectors';
import {
  TAB_BAR_ACTION_BUTTON,
  TAB_BAR_BROWSER_BUTTON,
  TAB_BAR_SETTING_BUTTON,
  TAB_BAR_WALLET_BUTTON,
  TAB_BAR_ACTIVITY_BUTTON,
} from '../testIDs/Components/TabBar.testIds';
import Gestures from '../../helpers/Gestures';
import BrowserScreen from '../BrowserObject/BrowserScreen';

class TabBarModal {
  get walletButton() {
    return Selectors.getElementByPlatform(TAB_BAR_WALLET_BUTTON);
  }

  get browserButton() {
    return Selectors.getElementByPlatform(TAB_BAR_BROWSER_BUTTON);
  }

  get actionButton() {
    return Selectors.getElementByPlatform(TAB_BAR_ACTION_BUTTON);
  }

  get settingsButton() {
    return Selectors.getElementByPlatform(TAB_BAR_SETTING_BUTTON);
  }

  get activityButton() {
    return Selectors.getElementByPlatform(TAB_BAR_ACTIVITY_BUTTON);
  }

  async tapWalletButton() {
    const walletButton = await this.walletButton;
    await walletButton.waitForDisplayed();

    const browserScreen = await BrowserScreen.container;
    let isBrowserDisplayed = true;

    while (isBrowserDisplayed) {
      await walletButton.click();
      await driver.pause(3000);
      isBrowserDisplayed = await browserScreen.isExisting();
    }
  }

  async tapBrowserButton() {
    await Gestures.waitAndTap(this.browserButton);
  }

  async tapActionButton() {
    const actionButton = await this.actionButton;
    await actionButton.waitForEnabled();
    await driver.pause(3000);
    await Gestures.longPress(actionButton, 500);
  }

  async tapSettingButton() {
    await Gestures.waitAndTap(this.settingsButton);
  }

  async tapActivityButton() {
    await Gestures.waitAndTap(this.activityButton);
  }
}

export default new TabBarModal();
