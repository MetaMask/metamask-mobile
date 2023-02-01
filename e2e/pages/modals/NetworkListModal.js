import TestHelpers from '../../helpers';
import {
  NETWORK_SCROLL_ID,
  NETWORK_LIST_MODAL_CONTAINER_ID,
  OTHER_NETWORK_LIST_ID,
} from '../../../wdio/screen-objects/testIDs/Components/NetworkListModal.TestIds';

export default class NetworkListModal {
  static async changeNetwork(networkName) {
    await TestHelpers.tapByText(networkName);
  }

  static async scrollToBottomOfNetworkList() {
    await TestHelpers.swipe(NETWORK_SCROLL_ID, 'up', 'fast');
    await TestHelpers.delay(1000);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(NETWORK_LIST_MODAL_CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(NETWORK_LIST_MODAL_CONTAINER_ID);
  }

  static async isNetworkNameVisibleInListOfNetworks(networkName) {
    await TestHelpers.checkIfElementHasString(
      OTHER_NETWORK_LIST_ID,
      networkName,
    );
  }
}
