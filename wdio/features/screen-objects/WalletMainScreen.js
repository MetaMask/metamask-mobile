import { WALLET_CONTAINER_ID,
  NAVBAR_TITLE_NETWORK} from '../testIDs/Screens/WalletScreen-testIds.js';
import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures.js';

class WalletMainScreen {

  get WalletScreenContainer(){
    return Selectors.getElementByPlatform(WALLET_CONTAINER_ID);
  }

  get networkNavBarWalletTitle() {
    return Selectors.getElementByPlatform(NAVBAR_TITLE_NETWORK);
  }

  get hamburgerMenu() {
    return Selectors.getElementByPlatform('hamburger-menu-button-wallet');
  }

  get drawerSettings(){
    return Selectors.getElementByPlatform('drawer-settings');
  }

  async isVisible() {
    await expect(this.WalletScreenContainer).toBeDisplayed();
  }

  async tapNetworkNavBar() {
    await Gestures.tap(this.networkNavBarWalletTitle);
  }

  async tapHamburgerMenu() {
    await Gestures.tap(this.hamburgerMenu);
  }

  async isNetworkNameCorrect(network){
    const textFromElement = await this.networkNavBarWalletTitle;
    const networkName = await textFromElement.getText();
      await expect(networkName).toContain(network);
    }

    async tapSettings() {
      await Gestures.tap(this.drawerSettings);
    }

}

export default new WalletMainScreen();
