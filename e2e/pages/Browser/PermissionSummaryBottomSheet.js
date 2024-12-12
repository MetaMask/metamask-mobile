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
  get addNetworkPermissionContainer() {
    return Matchers.getElementByID(
      PermissionSummaryBottomSheetSelectorsIDs.NETWORK_PERMISSIONS_CONTAINER,
    );
  }

  get connectedAccountsText() {
    return Matchers.getElementByText(
      PermissionSummaryBottomSheetSelectorsText.CONNECTED_ACCOUNTS_TEXT,
    );
  }

  async swipeToDismissModal() {
    await Gestures.swipe(this.container, 'down', 'fast');
  }
}

export default new PermissionSummaryBottomSheet();
