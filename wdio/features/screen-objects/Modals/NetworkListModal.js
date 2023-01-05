/* global driver */
import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';

import {
  GOERLI_TEST_NETWORK_OPTION,
  NETWORK_LIST_MODAL_CONTAINER_ID
} from '../../testIDs/Components/NetworkListModal.TestIds';

class NetworkListModal {
  get NetworkListModal() {
    return Selectors.getElementByPlatform(NETWORK_LIST_MODAL_CONTAINER_ID);
  }

  get goerliTestNetworkOption() {
    return Selectors.getElementByPlatform(GOERLI_TEST_NETWORK_OPTION);
  }

  async changeNetwork(networkName) {
    await driver.pause(2000);
    await Gestures.tapTextByXpath(networkName);
  }

  async scrollToBottomOfNetworkList() {
    await Gestures.swipe({ x: 100, y: 500 }, { x: 100, y: 10 });
  }

  async isVisible() {
    await expect(this.NetworkListModal).toBeDisplayed();
  }

  async isNotVisible() {
    await expect(this.NetworkListModal).not.toBeDisplayed();
  }

  async tapGoerliTestNetwork() {
    await Gestures.waitAndTap(this.goerliTestNetworkOption);
  }
}

export default new NetworkListModal();
