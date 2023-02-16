import TOKEN_ASSET_OVERVIEW from '../screen-objects/testIDs/Screens/TokenOverviewScreen.testIds';

class TokenScreen{
    get tokenAssetOverview() {
        return Selectors.getElementByPlatform(TOKEN_ASSET_OVERVIEW);
      }

      async isTokenOverviewVisible() {
        const element = await this.tokenAssetOverview;
        await element.waitForDisplayed();
      }
}

export default new TokenScreen();