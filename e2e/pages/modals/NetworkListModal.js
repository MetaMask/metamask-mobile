import TestHelpers from '../../helpers';
import {
  NETWORK_SCROLL_ID,
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

  static async swipeToDismissModal() {
    await TestHelpers.swipeByText('Select a network', 'down', 'slow', 0.6);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(NETWORK_SCROLL_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(NETWORK_SCROLL_ID);
  }

  static async isNetworkNameVisibleInListOfNetworks(networkName) {
    await TestHelpers.checkIfElementHasString(
      OTHER_NETWORK_LIST_ID,
      networkName,
    );
  }
}
