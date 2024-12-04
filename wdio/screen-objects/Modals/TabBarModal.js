import Selectors from '../../helpers/Selectors';

import { TabBarSelectorIDs } from '../../../e2e/selectors/wallet/TabBar.selectors';

import Gestures from '../../helpers/Gestures';
import BrowserScreen from '../BrowserObject/BrowserScreen';

class TabBarModal {
  get walletButton() {
    return Selectors.getXpathElementByResourceId(TabBarSelectorIDs.WALLET);
  }

  get browserButton() {
    return Selectors.getXpathElementByResourceId(TabBarSelectorIDs.BROWSER);
  }

  get actionButton() {
    return Selectors.getXpathElementByResourceId(TabBarSelectorIDs.ACTIONS);
  }

  get settingsButton() {
    return Selectors.getXpathElementByResourceId(TabBarSelectorIDs.SETTING);
  }

  get activityButton() {
    return Selectors.getXpathElementByResourceId(TabBarSelectorIDs.ACTIVITY);
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
    await driver.pause(10000);
    await Gestures.waitAndTap(this.settingsButton);
  }

  async tapActivityButton() {
    await Gestures.waitAndTap(this.activityButton);
  }
}

export default new TabBarModal();
