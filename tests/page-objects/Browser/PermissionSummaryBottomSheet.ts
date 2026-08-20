import {
  PermissionSummaryBottomSheetSelectorsIDs,
  PermissionSummaryBottomSheetSelectorsText,
} from '../../../app/components/Views/MultichainAccounts/shared/PermissionSummaryBottomSheet.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { EncapsulatedElementType } from '../../framework';

class PermissionSummaryBottomSheet {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(
      PermissionSummaryBottomSheetSelectorsIDs.CONTAINER,
    );
  }
  get addNetworkPermissionContainer(): EncapsulatedElementType {
    return Matchers.getElementByID(
      PermissionSummaryBottomSheetSelectorsIDs.NETWORK_PERMISSIONS_CONTAINER,
    );
  }

  get backButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      PermissionSummaryBottomSheetSelectorsIDs.BACK_BUTTON,
    );
  }

  get connectedAccountsText(): EncapsulatedElementType {
    return Matchers.getElementByText(
      PermissionSummaryBottomSheetSelectorsText.CONNECTED_ACCOUNTS_TEXT,
    );
  }

  get ethereumMainnetText(): EncapsulatedElementType {
    return Matchers.getElementByText(
      PermissionSummaryBottomSheetSelectorsText.ETHEREUM_MAINNET_LABEL,
    );
  }

  get accountPermissionLabelContainer(): EncapsulatedElementType {
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
