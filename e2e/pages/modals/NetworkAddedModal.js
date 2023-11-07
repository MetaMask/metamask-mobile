import TestHelpers from '../../helpers';
import {
  NetworkAddedModalSelectorsIDs,
  NetworkAddedModalSelectorsText,
} from '../../selectors/Modals/NetworkAddedModal.selectors';

export default class NetworkAddedModal {
  static async tapSwitchToNetwork() {
    await TestHelpers.tap(NetworkAddedModalSelectorsIDs.SWITCH_NETWORK_BUTTON);
  }
  static async tapCloseButton() {
    await TestHelpers.tap(NetworkAddedModalSelectorsIDs.CLOSE_NETWORK_BUTTON);
  }

  static async isVisible() {
    await TestHelpers.checkIfElementWithTextIsVisible(
      NetworkAddedModalSelectorsText.SWITCH_NETWORK,
    );
  }
  static async isNotVisible() {
    await TestHelpers.checkIfElementWithTextIsVisible(
      NetworkAddedModalSelectorsText.SWITCH_NETWORK,
    );
  }
}
