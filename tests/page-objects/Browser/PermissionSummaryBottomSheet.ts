import {
  PermissionSummaryBottomSheetSelectorsIDs,
  PermissionSummaryBottomSheetSelectorsText,
} from '../../../app/components/Views/MultichainAccounts/shared/PermissionSummaryBottomSheet.testIds';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class PermissionSummaryBottomSheet {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          PermissionSummaryBottomSheetSelectorsIDs.CONTAINER,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PermissionSummaryBottomSheetSelectorsIDs.CONTAINER,
        ),
    });
  }
  get addNetworkPermissionContainer(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          PermissionSummaryBottomSheetSelectorsIDs.NETWORK_PERMISSIONS_CONTAINER,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PermissionSummaryBottomSheetSelectorsIDs.NETWORK_PERMISSIONS_CONTAINER,
        ),
    });
  }

  get backButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          PermissionSummaryBottomSheetSelectorsIDs.BACK_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PermissionSummaryBottomSheetSelectorsIDs.BACK_BUTTON,
        ),
    });
  }

  get connectedAccountsText(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          PermissionSummaryBottomSheetSelectorsText.CONNECTED_ACCOUNTS_TEXT,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          PermissionSummaryBottomSheetSelectorsText.CONNECTED_ACCOUNTS_TEXT,
        ),
    });
  }

  get ethereumMainnetText(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          PermissionSummaryBottomSheetSelectorsText.ETHEREUM_MAINNET_LABEL,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          PermissionSummaryBottomSheetSelectorsText.ETHEREUM_MAINNET_LABEL,
        ),
    });
  }

  get accountPermissionLabelContainer(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          PermissionSummaryBottomSheetSelectorsIDs.ACCOUNT_PERMISSION_CONTAINER,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PermissionSummaryBottomSheetSelectorsIDs.ACCOUNT_PERMISSION_CONTAINER,
        ),
    });
  }

  async swipeToDismissModal(): Promise<void> {
    await UnifiedGestures.swipe(this.container, 'down', {
      speed: 'fast',
      elemDescription: 'Swipe to dismiss the modal',
    });
  }

  async tapBackButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.backButton, {
      elemDescription: 'Tap on the back button',
    });
  }
}

export default new PermissionSummaryBottomSheet();
