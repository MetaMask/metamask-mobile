import TestHelpers from '../../helpers';
import {
  NEW_NETWORK_ADDED_CLOSE_BUTTON_ID,
  NEW_NETWORK_ADDED_SWITCH_TO_NETWORK_BUTTON_ID,
} from '../../../app/constants/test-ids';
import messages from '../../../locales/languages/en.json';

const switchToNetworkText = messages.networks.new_network;

export default class NetworkAddedModal {
  static async tapSwitchToNetwork() {
    await TestHelpers.tap(NEW_NETWORK_ADDED_SWITCH_TO_NETWORK_BUTTON_ID);
  }
  static async tapCloseButton() {
    await TestHelpers.tap(NEW_NETWORK_ADDED_CLOSE_BUTTON_ID);
  }

  static async isVisible() {
    await TestHelpers.checkIfElementWithTextIsVisible(switchToNetworkText);
  }
  static async isNotVisible() {
    await TestHelpers.checkIfElementWithTextIsVisible(switchToNetworkText);
  }
}
