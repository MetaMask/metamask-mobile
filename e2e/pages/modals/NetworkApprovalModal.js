import TestHelpers from '../../helpers';
import { NetworkApprovalModalSelectorsIDs } from '../../selectors/Modals/NetworkApprovalModal.selectors';
export default class NetworkApprovalModal {
  static async tapApproveButton() {
    await TestHelpers.tap(NetworkApprovalModalSelectorsIDs.APPROVE_BUTTON);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(
      NetworkApprovalModalSelectorsIDs.CONTAINER,
    );
  }

  static async isDisplayNameVisible(displayName) {
    await TestHelpers.checkIfHasText(
      NetworkApprovalModalSelectorsIDs.DISPLAY_NAME,
      displayName,
    );
  }

  static async isChainIDVisible(chainID) {
    await TestHelpers.checkIfElementWithTextIsVisible(chainID);
  }

  static async isNetworkURLVisible(networkURL) {
    await TestHelpers.checkIfElementWithTextIsVisible(networkURL);
  }
}
