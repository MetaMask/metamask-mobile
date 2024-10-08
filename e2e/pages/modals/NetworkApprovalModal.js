import { NetworkApprovalModalSelectorsIDs } from '../../selectors/Modals/NetworkApprovalModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import TestHelpers from '../../helpers';

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
    await Gestures.tap(this.approvedButton);
  }
}

export default new NetworkApprovalModal();
