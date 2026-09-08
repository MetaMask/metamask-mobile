import { NetworkApprovalBottomSheetSelectorsIDs } from '../../../app/components/UI/NetworkModal/NetworkApprovalBottomSheet.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { type AppiumElement } from '../../framework';

class NetworkApprovalBottomSheet {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      NetworkApprovalBottomSheetSelectorsIDs.CONTAINER,
    );
  }

  get approvedButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      NetworkApprovalBottomSheetSelectorsIDs.APPROVE_BUTTON,
    );
  }
  get cancelButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      NetworkApprovalBottomSheetSelectorsIDs.CANCEL_BUTTON,
    );
  }

  get displayName(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      NetworkApprovalBottomSheetSelectorsIDs.DISPLAY_NAME,
    );
  }

  async tapApproveButton(): Promise<void> {
    await Gestures.waitAndTap(this.approvedButton, {
      elemDescription: 'Approve Button in Network Approval Bottom Sheet',
    });
  }
  async tapCancelButton(): Promise<void> {
    await Gestures.waitAndTap(this.cancelButton, {
      elemDescription: 'Cancel Button in Network Approval Bottom Sheet',
    });
  }
}

export default new NetworkApprovalBottomSheet();
