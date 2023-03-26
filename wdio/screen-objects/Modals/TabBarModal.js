import Selectors from '../../helpers/Selectors';
import {
  TAB_BAR_ACTION_BUTTON,
  TAB_BAR_BROWSER_BUTTON,
  TAB_BAR_WALLET_BUTTON,
} from '../testIDs/Components/TabBar.testIds';
import Gestures from '../../helpers/Gestures';

class TabBarModal {
  get walletButton() {
    return Selectors.getXpathElementByContentDescription(TAB_BAR_WALLET_BUTTON);
  }

  get browserButton() {
    return Selectors.getElementByPlatform(TAB_BAR_BROWSER_BUTTON);
  }

  get actionButton() {
    return Selectors.getElementByPlatform(TAB_BAR_ACTION_BUTTON);
  }

  async tapWalletButton() {
    await Gestures.waitAndTap(this.walletButton);
  }

  async tapBrowserButton() {
    await Gestures.waitAndTap(this.browserButton);
  }

  async tapActionButton() {
    await Gestures.waitAndTap(this.actionButton);
  }
}

export default new TabBarModal();
