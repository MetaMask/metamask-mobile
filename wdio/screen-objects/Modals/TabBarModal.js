import Selectors from '../../helpers/Selectors';
import AppwrightSelectors from '../../helpers/AppwrightSelectors.js';
import { TabBarSelectorIDs } from '../../../e2e/selectors/wallet/TabBar.selectors';
import Gestures from '../../helpers/Gestures';
import BrowserScreen from '../BrowserObject/BrowserScreen';
import { expect as appwrightExpect } from 'appwright';

class TabBarModal {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get walletButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(TabBarSelectorIDs.WALLET);
    } else {
      return AppwrightSelectors.getElementByID(this._device, TabBarSelectorIDs.WALLET);
    }
  }

  get browserButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(TabBarSelectorIDs.BROWSER);
    } else {
      return AppwrightSelectors.getElementByID(this._device, TabBarSelectorIDs.BROWSER);
    }
  }

  get actionButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(TabBarSelectorIDs.ACTIONS);
    } else {
      return AppwrightSelectors.getElementByID(this._device, TabBarSelectorIDs.ACTIONS);
    }
  }

  get settingsButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(TabBarSelectorIDs.SETTING);
    } else {
      return AppwrightSelectors.getElementByID(this._device, TabBarSelectorIDs.SETTING);
    }
  }

  get activityButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(TabBarSelectorIDs.ACTIVITY);
    } else {
      return AppwrightSelectors.getElementByID(this._device, TabBarSelectorIDs.ACTIVITY);
    }
  }

  async tapWalletButton() {
    if (!this._device) {
      const walletButton = await this.walletButton;
      await walletButton.waitForDisplayed();

      const browserScreen = await BrowserScreen.container;
      let isBrowserDisplayed = true;

      while (isBrowserDisplayed) {
        await walletButton.click();
        await driver.pause(3000);
        isBrowserDisplayed = await browserScreen.isExisting();
      }
    } else {
      const walletIcon = await this.walletButton;
      await appwrightExpect(walletIcon).toBeVisible();

      // For Appwright, we'll use a simpler approach
      await walletIcon.tap();
    }
  }

  async tapBrowserButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.browserButton);
    } else {
      const browserIcon = await this.browserButton;
      await browserIcon.tap();
    }
  }

  async tapActionButton() {
    if (!this._device) {
      const actionButton = await this.actionButton;
      await actionButton.waitForEnabled();
      await driver.pause(3000);
      await Gestures.longPress(actionButton, 500);
    } else {
      const actionButton = await this.actionButton;
      await appwrightExpect(actionButton).toBeVisible();
      await actionButton.tap();
    }
  }

  async tapSettingButton() {
    if (!this._device) {
      await driver.pause(10000);
      await Gestures.waitAndTap(this.settingsButton);
    } else {
      const settingsButton = await this.settingsButton;
      await settingsButton.tap();
    }
  }

  async tapActivityButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.activityButton);
    } else {
      const activityButton = await this.activityButton;
      await activityButton.tap();
    }
  }
}

export default new TabBarModal();