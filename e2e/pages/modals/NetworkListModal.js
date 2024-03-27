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

  get testSwitch() {
    return Matchers.getElementByID(NetworkListModalSelectorsIDs.TEST_SWITCH);
  }

  async getCustomNetwork(network) {
    if (device.getPlatform() === 'android') {
      return Matchers.getElementByText(network);
    }
    const regex = new RegExp('[A-Za-z0-9]\\s' + network, 'is');
    return Matchers.getElementByIDAndLabel(CellModalSelectorsIDs.SELECT, regex);
  }

  async changeToNetwork(networkName) {
    const elem = Matchers.getElementByText(networkName);
    await Gestures.waitAndTap(elem);
  }

  async changeToCustomNetwork(networkName) {
    const elem = this.getCustomNetwork(networkName);
    await Gestures.waitAndTap(elem);
  }

  async scrollToBottomOfNetworkList() {
    await Gestures.swipe(this.networkScroll, 'up', 'fast');
  }

  async swipeToDismissModal() {
    await Gestures.swipe(this.selectNetwork, 'down', 'slow', 0.6);
  }

  async tapTestNetworkSwitch() {
    await Gestures.waitAndTap(this.testSwitch);
  }
}

export default new NetworkListModal();
