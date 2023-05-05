import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';

import { NETWORK_SCROLL_ID } from '../testIDs/Components/NetworkListModal.TestIds';
import { ADD_NETWORK_BUTTON } from '../testIDs/Screens/NetworksScreen.testids';

class NetworkListModal {
  get scroll() {
    return Selectors.getElementByPlatform(NETWORK_SCROLL_ID);
  }

  get addNetworkButton() {
    return Selectors.getElementByPlatform(ADD_NETWORK_BUTTON);
  }

  async changeNetwork(networkName) {
    await Gestures.tapTextByXpath(networkName);
  }

  async waitForDisplayed() {
    const scroll = await this.scroll;
    await scroll.waitForDisplayed();
  }

  async waitForDisappear() {
    const scroll = await this.scroll;
    await scroll.waitForDisplayed({ reverse: true });
  }

  async tapAddNetworkButton() {
    await Gestures.waitAndTap(this.addNetworkButton);
  }
}

export default new NetworkListModal();
