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

  get ethereumMainnetText() {
    return Matchers.getElementByText(
      PermissionSummaryBottomSheetSelectorsText.ETHEREUM_MAINNET_LABEL,
    );
  }

  get accountPermissionLabelContainer() {
    return Matchers.getElementByID(
      PermissionSummaryBottomSheetSelectorsIDs.ACCOUNT_PERMISSION_CONTAINER,
    );
  }

  async swipeToDismissModal() {
    await Gestures.swipe(this.container, 'down', 'fast');
  }
}

export default new PermissionSummaryBottomSheet();
