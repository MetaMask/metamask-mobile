import {
  PermissionSummaryBottomSheetSelectorsIDs,
  PermissionSummaryBottomSheetSelectorsText,
} from '../../../app/components/Views/AccountConnect/PermissionSummaryBottomSheet.testIds';
import Matchers from '../../../tests/framework/Matchers';
import Gestures from '../../../tests/framework/Gestures';

class PermissionSummaryBottomSheet {
  get container(): DetoxElement {
    return Matchers.getElementByID(
      PermissionSummaryBottomSheetSelectorsIDs.CONTAINER,
    );
  }
  get addNetworkPermissionContainer(): DetoxElement {
    return Matchers.getElementByID(
      PermissionSummaryBottomSheetSelectorsIDs.NETWORK_PERMISSIONS_CONTAINER,
    );
  }

  get backButton(): DetoxElement {
    return Matchers.getElementByID(
      PermissionSummaryBottomSheetSelectorsIDs.BACK_BUTTON,
    );
  }

  get connectedAccountsText(): DetoxElement {
    return Matchers.getElementByText(
      PermissionSummaryBottomSheetSelectorsText.CONNECTED_ACCOUNTS_TEXT,
    );
  }

  get ethereumMainnetText(): DetoxElement {
    return Matchers.getElementByText(
      PermissionSummaryBottomSheetSelectorsText.ETHEREUM_MAINNET_LABEL,
    );
  }

  get accountPermissionLabelContainer(): DetoxElement {
    return Matchers.getElementByID(
      PermissionSummaryBottomSheetSelectorsIDs.ACCOUNT_PERMISSION_CONTAINER,
    );
  }

  async swipeToDismissModal(): Promise<void> {
    await Gestures.swipe(this.container, 'down', {
      speed: 'fast',
      elemDescription: 'Swipe to dismiss the modal',
    });
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Tap on the back button',
    });
  }
}

export default new PermissionSummaryBottomSheet();
