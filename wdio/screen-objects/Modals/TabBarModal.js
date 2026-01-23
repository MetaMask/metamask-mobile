import Selectors from '../../helpers/Selectors';
import AppwrightSelectors from '../../../tests/framework/AppwrightSelectors';
import AppwrightGestures from '../../../tests/framework/AppwrightGestures';
import { TabBarSelectorIDs } from '../../../app/components/Nav/Main/TabBar.testIds';
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

  get tradeButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(TabBarSelectorIDs.TRADE);
    } else {
      return AppwrightSelectors.getElementByID(this._device, TabBarSelectorIDs.TRADE);
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

      // Use static tap method with retry logic
      await AppwrightGestures.tap(walletIcon);
    }
  }

  async tapBrowserButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.browserButton);
    } else {
      await AppwrightGestures.tap(await this.browserButton); // Use static tap method with retry logic
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
      await AppwrightGestures.tap(actionButton); // Use static tap method with retry logic
    }
  }

  async tapTradeButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.tradeButton);
    } else {
      await AppwrightGestures.tap(await this.tradeButton);
    }
  }

  async tapSettingButton() {
    if (!this._device) {
      await driver.pause(10000);
      await Gestures.waitAndTap(this.settingsButton);
    } else {
      await AppwrightGestures.tap(await this.settingsButton); // Use static tap method with retry logic
    }
  }

  async tapActivityButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.activityButton);
    } else {
      await AppwrightGestures.tap(await this.activityButton); // Use static tap method with retry logic
    }
  }
}

export default new TabBarModal();
