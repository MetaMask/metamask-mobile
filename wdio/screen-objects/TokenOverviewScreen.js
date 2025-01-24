import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures';
import { TokenOverviewSelectorsIDs } from '../../e2e/selectors/wallet/TokenOverview.selectors';

class TokenOverviewScreen {
  get tokenAssetOverview() {
    return Selectors.getElementByPlatform(TokenOverviewSelectorsIDs.CONTAINER);
  }

  get sendButton() {
    return Selectors.getElementByPlatform(TokenOverviewSelectorsIDs.SEND_BUTTON);
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
