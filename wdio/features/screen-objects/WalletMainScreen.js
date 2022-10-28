import { WALLET_CONTAINER_ID } from '../testIDs/Screens/WalletScreen-testIds.js';
import Selectors from '../helpers/Selectors';

class WalletMainScreen {

  get WalletScreenContainer(){
    return Selectors.getElementByPlatform(WALLET_CONTAINER_ID);
  }
  async isVisible() {
    await expect(this.WalletScreenContainer).toBeDisplayed();
  }
}

export default new WalletMainScreen();
