import TestHelpers from '../../helpers';
import {
  NEW_NETWORK_ADDED_CLOSE_BUTTON_ID,
  NEW_NETWORK_ADDED_SWITCH_TO_NETWORK_BUTTON_ID,
} from '../../../app/constants/test-ids';
import { strings } from '../../../locales/i18n';

const switchToNetworkText = strings('networks.new_network');

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
