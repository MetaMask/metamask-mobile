import {
  NetworkListModalSelectorsIDs,
  NetworkListModalSelectorsText,
} from '../../selectors/Modals/NetworkListModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class NetworkListModal {
  get networkScroll() {
    return Matchers.getElementByID(NetworkListModalSelectorsIDs.SCROLL);
  }

  get selectNetwork() {
    return Matchers.getElementByText(
      NetworkListModalSelectorsText.SELECT_NETWORK,
    );
  }

  get otherNetworkList() {
    return Matchers.getElementByID(NetworkListModalSelectorsIDs.OTHER_LIST);
  }

  get addNetworkButton() {
    return Matchers.getElementByID(NetworkListModalSelectorsIDs.ADD_BUTTON);
  }

  get testSwitch() {
    return Matchers.getElementByID(NetworkListModalSelectorsIDs.TEST_SWITCH);
  }

  async changeNetwork(networkName) {
    return Matchers.getElementByText(networkName);
  }

  async scrollToBottomOfNetworkList() {
    await Gestures.swipe(this.networkScroll, 'up', 'fast');
  }

  async swipeToDismissModal() {
    await Gestures.swipe(this.selectNetwork, 'down', 'slow', 0.6);
  }

  async tapTestNetworkSwitch() {
    await Gestures.waitAndTap(this.networkScroll);
  }
}

export default new NetworkListModal();
