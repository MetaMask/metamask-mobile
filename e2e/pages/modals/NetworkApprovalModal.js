import { NetworkApprovalModalSelectorsIDs } from '../../selectors/Modals/NetworkApprovalModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class NetworkApprovalModal {
  get container() {
    return Matchers.getElementByID(NetworkApprovalModalSelectorsIDs.CONTAINER);
  }

  get approvedButton() {
    return Matchers.getElementByID(
      NetworkApprovalModalSelectorsIDs.APPROVE_BUTTON,
    );
  }

  get displayName() {
    return Matchers.getElementByID(
      NetworkApprovalModalSelectorsIDs.DISPLAY_NAME,
    );
  }

  async tapApproveButton() {
    await Gestures.waitAndTap(this.approvedButton);
  }

  //static async isChainIDVisible(chainID) {
  //  await TestHelpers.checkIfElementWithTextIsVisible(chainID);
  //}

  //static async isNetworkURLVisible(networkURL) {
  //  await TestHelpers.checkIfElementWithTextIsVisible(networkURL);
  //}
}

export default new NetworkApprovalModal();
