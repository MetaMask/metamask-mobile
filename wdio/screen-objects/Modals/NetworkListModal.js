import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';

import {
  GOERLI_TEST_NETWORK_OPTION,
  NETWORK_LIST_CLOSE_ICON,
  NETWORK_LIST_MODAL_CONTAINER_ID,
} from '../testIDs/Components/NetworkListModal.TestIds';

class NetworkListModal {
  get NetworkListModal() {
    return Selectors.getElementByPlatform(NETWORK_LIST_MODAL_CONTAINER_ID);
  }

  get goerliTestNetworkOption() {
    return Selectors.getElementByPlatform(GOERLI_TEST_NETWORK_OPTION);
  }

  get goerliNetworkSelectedIcon() {
    return Selectors.getElementByPlatform(
      `${GOERLI_TEST_NETWORK_OPTION}-selected`,
    );
  }

  get networkListCloseIcon() {
    return Selectors.getElementByPlatform(NETWORK_LIST_CLOSE_ICON);
  }

  async changeNetwork(networkName) {
    await Gestures.tapTextByXpath(networkName);
  }

  async scrollToBottomOfNetworkList() {
    await Gestures.swipe({ x: 100, y: 500 }, { x: 100, y: 10 });
  }

  async isVisible() {
    await expect(await this.NetworkListModal).toBeDisplayed();
  }

  async isNotVisible() {
    const networkListModal = await this.NetworkListModal;
    await networkListModal.waitForExist({ reverse: true });
  }

  async tapGoerliTestNetwork() {
    await Gestures.waitAndTap(this.goerliTestNetworkOption);
  }

  async isGoerliNetworkSelectedIconDisplayed() {
    await expect(await this.goerliNetworkSelectedIcon).toBeDisplayed();
  }

  async tapNetworkListCloseIcon() {
    await Gestures.waitAndTap(this.networkListCloseIcon);
  }
}

export default new NetworkListModal();
