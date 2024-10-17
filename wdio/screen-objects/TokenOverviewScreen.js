import {
  TOKEN_ASSET_OVERVIEW,
  TOKEN_OVERVIEW_SEND_BUTTON,
} from './testIDs/Screens/TokenOverviewScreen.testIds.js';
import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures';
import { ImportTokenViewSelectorsIDs } from '../../e2e/selectors/wallet/ImportTokenView.selectors';

class TokenOverviewScreen {
  get tokenAssetOverview() {
    return Selectors.getElementByPlatform(TOKEN_ASSET_OVERVIEW);
  }

  get sendButton() {
    return Selectors.getElementByPlatform(TOKEN_OVERVIEW_SEND_BUTTON);
  }

  get backButtonTokenOverview() {
    return Selectors.getElementByPlatform(ImportTokenViewSelectorsIDs.BACK_BUTTON);
  }

  async tapBackButton() {
    await Gestures.waitAndTap(this.backButtonTokenOverview);
  }

  async isTokenOverviewVisible() {
    const element = await this.tokenAssetOverview;
    await element.waitForDisplayed();
  }

  async tapSendButton() {
    await Gestures.swipeUp(0.5);
    await driver.pause(1000);
    await Gestures.waitAndTap(this.sendButton);
  }
}

export default new TokenOverviewScreen();
