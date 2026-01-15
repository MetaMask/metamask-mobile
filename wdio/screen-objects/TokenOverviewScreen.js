import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures';
import { TokenOverviewSelectorsIDs } from '../../app/components/UI/AssetOverview/TokenOverview.testIds';
import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';
import { expect as expectAppwright } from 'appwright';
import AppwrightGestures from '../../e2e/framework/AppwrightGestures';
class TokenOverviewScreen {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get todaysChange() {
    if (!this._device) {
      return Selectors.getElementByPlatform(TokenOverviewSelectorsIDs.TODAYS_CHANGE);
    } else {
      return AppwrightSelectors.getElementByText(this._device, '%) Today');
    }
  }

  get tokenAssetOverview() {
    if (!this._device) {
      return Selectors.getElementByPlatform(TokenOverviewSelectorsIDs.CONTAINER);
    } else {
      return AppwrightSelectors.getElementByID(this._device, TokenOverviewSelectorsIDs.CONTAINER);
    }
  }

  get sendButton() {
    if (!this._device) {
      return Selectors.getElementByPlatform(TokenOverviewSelectorsIDs.SEND_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, TokenOverviewSelectorsIDs.SEND_BUTTON);
    }
  }

  async isTokenOverviewVisible() {
    if (!this._device) {
      const element = await this.tokenAssetOverview;
      await element.waitForDisplayed();
    } else {
      const element = await this.tokenAssetOverview;
      expectAppwright(element).toBeVisible();
    }
  }

  async isTodaysChangeVisible() {
    if (!this._device) {
      const element = await this.todaysChange;
      await element.waitForDisplayed();
    } else {
      const element = await this.todaysChange;
      expectAppwright(element).toBeVisible({ timeout: 10000 });
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  async tapSendButton() {
    if (!this._device) {
    await Gestures.swipeUp(0.5);
    await driver.pause(1000);
    await Gestures.waitAndTap(this.sendButton);
    }
    else {
      await AppwrightGestures.tap(await this.sendButton);
    }
  }

  async isSendButtonVisible() {
    if (!this._device) {
      const element = await this.sendButton;
      await element.waitForDisplayed();
    } else {
      const element = await this.sendButton;
      expectAppwright(await element).toBeVisible();
    }
  }
}

export default new TokenOverviewScreen();
