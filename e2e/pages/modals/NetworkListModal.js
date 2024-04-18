import {
  NetworkListModalSelectorsIDs,
  NetworkListModalSelectorsText,
} from '../../selectors/Modals/NetworkListModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { CellModalSelectorsIDs } from '../../selectors/Modals/CellModal.selectors';

class NetworkListModal {
  get networkScroll() {
    return Matchers.getElementByID(NetworkListModalSelectorsIDs.SCROLL);
  }

  get selectNetwork() {
    return Matchers.getElementByText(
      NetworkListModalSelectorsText.SELECT_NETWORK,
    );
  }

  get testNetToggle() {
    return Matchers.getElementByID(
      NetworkListModalSelectorsIDs.TEST_NET_TOGGLE,
    );
  }

  async getCustomNetwork(network, custom = false) {
    if (device.getPlatform() === 'android' || !custom) {
      return Matchers.getElementByText(network);
    }

    // Covers the scenario when selecting a custom network on iOS.
    // Network icon would also be part of the network name
    const regex = new RegExp('[A-Z0-9]\\s' + network, 'is');
    return Matchers.getElementByIDAndLabel(CellModalSelectorsIDs.SELECT, regex);
  }

  async changeNetworkTo(networkName, custom) {
    const elem = this.getCustomNetwork(networkName, custom);
    await Gestures.waitAndTap(elem);
  }

  async scrollToBottomOfNetworkList() {
    await Gestures.swipe(this.networkScroll, 'up', 'fast');
  }

  async swipeToDismissModal() {
    await Gestures.swipe(this.selectNetwork, 'down', 'slow', 0.6);
  }

  async tapTestNetworkSwitch() {
    await Gestures.waitAndTap(this.testNetToggle);
  }
}

export default new NetworkListModal();
