import { NetworkApprovalBottomSheetSelectorsIDs } from '../../selectors/Network/NetworkApprovalBottomSheet.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class NetworkApprovalBottomSheet {
  get container() {
    return Matchers.getElementByID(NetworkApprovalBottomSheetSelectorsIDs.CONTAINER);
  }

  get approvedButton() {
    return Matchers.getElementByID(
      NetworkApprovalBottomSheetSelectorsIDs.APPROVE_BUTTON,
    );
  }

  get displayName() {
    return Matchers.getElementByID(
      NetworkApprovalBottomSheetSelectorsIDs.DISPLAY_NAME,
    );
  }

  async tapApproveButton() {
    await Gestures.tap(this.approvedButton);
  }
}

export default new NetworkApprovalBottomSheet();
