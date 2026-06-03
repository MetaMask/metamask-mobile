import { NetworkApprovalBottomSheetSelectorsIDs } from '../../../app/components/UI/NetworkModal/NetworkApprovalBottomSheet.testIds';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class NetworkApprovalBottomSheet {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          NetworkApprovalBottomSheetSelectorsIDs.CONTAINER,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworkApprovalBottomSheetSelectorsIDs.CONTAINER,
        ),
    });
  }

  get approvedButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          NetworkApprovalBottomSheetSelectorsIDs.APPROVE_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworkApprovalBottomSheetSelectorsIDs.APPROVE_BUTTON,
        ),
    });
  }
  get cancelButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          NetworkApprovalBottomSheetSelectorsIDs.CANCEL_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworkApprovalBottomSheetSelectorsIDs.CANCEL_BUTTON,
        ),
    });
  }

  get displayName(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          NetworkApprovalBottomSheetSelectorsIDs.DISPLAY_NAME,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworkApprovalBottomSheetSelectorsIDs.DISPLAY_NAME,
        ),
    });
  }

  async tapApproveButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.approvedButton, {
      elemDescription: 'Approve Button in Network Approval Bottom Sheet',
    });
  }
  async tapCancelButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.cancelButton, {
      elemDescription: 'Cancel Button in Network Approval Bottom Sheet',
    });
  }
}

export default new NetworkApprovalBottomSheet();
