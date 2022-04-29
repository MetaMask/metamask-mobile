import TestHelpers from '../../helpers';
import {
  APPROVE_NETWORK_DISPLAY_NAME_ID,
  APPROVE_NETWORK_MODAL_ID,
  APPROVE_NETWORK_CANCEL_BUTTON_ID,
  APPROVE_NETWORK_APPROVE_BUTTON_ID,
} from '../../../app/constants/test-ids';
export default class NetworkApprovalModal {
  static async tapApproveButton() {
    await TestHelpers.tap(APPROVE_NETWORK_APPROVE_BUTTON_ID);
  }

  static async tapCanelButton() {
    await TestHelpers.tap(APPROVE_NETWORK_CANCEL_BUTTON_ID);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(APPROVE_NETWORK_MODAL_ID);
  }
  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(APPROVE_NETWORK_MODAL_ID);
  }

  static async isDisplayNameVisible(displayName) {
    await TestHelpers.checkIfHasText(
      APPROVE_NETWORK_DISPLAY_NAME_ID,
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
