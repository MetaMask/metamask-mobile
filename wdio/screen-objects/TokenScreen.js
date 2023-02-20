import {
  TOKEN_ASSET_OVERVIEW,
  ASSET_BACK_BUTTON,
} from '../screen-objects/testIDs/Screens/TokenOverviewScreen.testIds';
import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures';

class TokenScreen {
  get tokenAssetOverview() {
    return Selectors.getElementByPlatform(TOKEN_ASSET_OVERVIEW);
  }

  get backButtonTokenOverview() {
    return Selectors.getElementByPlatform(ASSET_BACK_BUTTON);
  }

  async isTokenOverviewVisible() {
    const element = await this.tokenAssetOverview;
    await element.waitForDisplayed();
  }

  async tapBackButton() {
    await Gestures.tap(this.backButtonTokenOverview);
  }
}

export default new TokenScreen();
