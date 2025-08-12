import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures';
import { TokenOverviewSelectorsIDs } from '../../e2e/selectors/wallet/TokenOverview.selectors';
import AppwrightSelectors from '../helpers/AppwrightSelectors';
import { expect as expectAppwright } from 'appwright';
class TokenOverviewScreen {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get tokenAssetOverview() {
    if (!this._device) {
      return Selectors.getElementByPlatform(TokenOverviewSelectorsIDs.CONTAINER);
    } else {
      return AppwrightSelectors.getElementByID(this._device, TokenOverviewSelectorsIDs.CONTAINER);
    }
  }

  get sendButton() {
    return Selectors.getElementByPlatform(TokenOverviewSelectorsIDs.SEND_BUTTON);
  }

  async isTokenOverviewVisible() {
    if (!this._device) {
      const element = await this.tokenAssetOverview;
      await element.waitForDisplayed();
    } else {
      console.log('Aqui llega', await this.tokenAssetOverview);
      const element = await this.tokenAssetOverview;
      expectAppwright(element).toBeVisible();
    }
  }

  async tapSendButton() {
    await Gestures.swipeUp(0.5);
    await driver.pause(1000);
    await Gestures.waitAndTap(this.sendButton);
  }
}

export default new TokenOverviewScreen();
