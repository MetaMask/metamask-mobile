import {
  NetworkListModalSelectorsIDs,
  NetworkListModalSelectorsText,
} from '../../selectors/Network/NetworkListModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import TestHelpers from '../../helpers';
import { NetworksViewSelectorsIDs } from '../../selectors/Settings/NetworksView.selectors';

class NetworkListModal {
  get networkScroll() {
    return Matchers.getElementByID(NetworkListModalSelectorsIDs.SCROLL);
  }

  get closeIcon() {
    return Matchers.getElementByID(NetworksViewSelectorsIDs.CLOSE_ICON);
  }

  get deleteNetworkButton() {
    return Matchers.getElementByText(
      NetworkListModalSelectorsText.DELETE_NETWORK,
    );
  }

  get addPopularNetworkButton() {
    return Matchers.getElementByText(
      NetworkListModalSelectorsText.ADD_POPULAR_NETWORK_BUTTON,
    );
  }

  get networkSearchInput() {
    return Matchers.getElementByID(
      NetworksViewSelectorsIDs.SEARCH_NETWORK_INPUT_BOX_ID,
    );
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

  get deleteButton() {
    return Matchers.getElementByID('delete-network-button');
  }

  async getCustomNetwork(network, custom = false) {
    if (device.getPlatform() === 'android' || !custom) {
      return Matchers.getElementByText(network);
    }

    return Matchers.getElementByID(
      NetworkListModalSelectorsIDs.CUSTOM_NETWORK_CELL(network),
    );
  }

  async tapDeleteButton() {
    await Gestures.waitAndTap(this.deleteNetworkButton);
  }

  async scrollToTopOfNetworkList() {
    await Gestures.swipe(this.networkScroll, 'down', 'fast');
  }

  async changeNetworkTo(networkName, custom) {
    const elem = this.getCustomNetwork(networkName, custom);
    await Gestures.waitAndTap(elem);
    await TestHelpers.delay(3000);
  }

  async scrollToBottomOfNetworkList() {
    await Gestures.swipe(this.networkScroll, 'up', 'fast');
    await TestHelpers.delay(3000);
  }

  async swipeToDismissModal() {
    await Gestures.swipe(this.selectNetwork, 'down', 'slow', 0.9);
  }

  async tapTestNetworkSwitch() {
    await Gestures.waitAndTap(this.testNetToggle);
  }

  async longPressOnNetwork(networkName) {
    const network = Matchers.getElementByText(networkName);
    await Gestures.tapAndLongPress(network);
  }

  async SearchNetworkName(networkName) {
    await Gestures.typeTextAndHideKeyboard(
      this.networkSearchInput,
      networkName,
    );
  }

  async tapClearSearch() {
    await Gestures.waitAndTap(this.closeIcon);
  }

  async tapAddNetworkButton() {
    await Gestures.waitAndTap(this.addPopularNetworkButton);
  }
  async deleteNetwork() {
    await Gestures.waitAndTap(this.deleteButton);
  }
}

export default new NetworkListModal();
