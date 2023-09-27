import TestHelpers from '../../helpers';
import {
  NETWORK_SCROLL_ID,
  NETWORK_TEST_SWITCH_ID,
  OTHER_NETWORK_LIST_ID,
  ADD_NETWORK_BUTTON,
} from '../../../wdio/screen-objects/testIDs/Components/NetworkListModal.TestIds';

import messages from '../../../locales/languages/en.json';

const SELECT_NETWORK_TEXT = messages.networks.select_network;
export default class NetworkListModal {
  static async changeNetwork(networkName) {
    await TestHelpers.tapByText(networkName);
  }

  static async scrollToBottomOfNetworkList() {
    await TestHelpers.swipe(NETWORK_SCROLL_ID, 'up', 'fast');
    await TestHelpers.delay(1000);
  }

  static async swipeToDismissModal() {
    await TestHelpers.swipeByText(SELECT_NETWORK_TEXT, 'down', 'slow', 0.6);
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

  static async tapTestNetworkSwitch() {
    await TestHelpers.waitAndTap(NETWORK_TEST_SWITCH_ID);
  }

  static async tapAddNetworkButton() {
    await TestHelpers.waitAndTap(ADD_NETWORK_BUTTON);
  }

  static async isTestNetworkToggleOn() {
    await TestHelpers.checkIfToggleIsOn(NETWORK_TEST_SWITCH_ID);
  }

  static async isTestNetworkToggleOff() {
    await TestHelpers.checkIfToggleIsOff(NETWORK_TEST_SWITCH_ID);
  }

  static async isTestNetworkDisplayed(networkName) {
    await TestHelpers.checkIfElementWithTextIsNotVisible(networkName);
  }
}
