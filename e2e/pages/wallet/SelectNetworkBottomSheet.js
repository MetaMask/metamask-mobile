import {
  PermissionSummaryBottomSheetSelectorsIDs,
  PermissionSummaryBottomSheetSelectorsText,
} from '../../selectors/Browser/PermissionSummaryBottomSheet.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

class SelectNetworksBottomSheet {
  get connectedAccountsText() {
    return Matchers.getElementByText(
      PermissionSummaryBottomSheetSelectorsText.CONNECTED_ACCOUNTS_TEXT,
    );
  }

  async swipeToDismiss() {
    await Gestures.swipe(this.connectedAccountsText, 'down', 'fast', 0.6);
  }

  async longPressOnNetwork(networkName) {
    const networkElement = await Matchers.getElementByText(networkName);
    await Gestures.tapAndLongPress(networkElement);
  }
}

export default new SelectNetworksBottomSheet();
