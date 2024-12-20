import {
  PermissionSummaryBottomSheetSelectorsIDs,
  PermissionSummaryBottomSheetSelectorsText,
} from '../../selectors/Browser/PermissionSummaryBottomSheet.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class PermissionSummaryBottomSheet {
  get container() {
    return Matchers.getElementByID(
      PermissionSummaryBottomSheetSelectorsIDs.CONTAINER,
    );
  }

  get ethereumMainnetText() {
    return Matchers.getElementByText(
      PermissionSummaryBottomSheetSelectorsText.ETHEREUM_MAINNET_TEXT,
    );
  }

  get accountPermissionText() {
    return Matchers.getElementByID(
      PermissionSummaryBottomSheetSelectorsIDs.ACCOUNT_PERMISSION_TEXT,
    );
  }

  async swipeToDismissModal() {
    await Gestures.swipe(this.container, 'down', 'fast');
  }
}

export default new PermissionSummaryBottomSheet();
