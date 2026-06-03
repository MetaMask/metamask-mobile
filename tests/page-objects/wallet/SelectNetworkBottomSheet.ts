import { PermissionSummaryBottomSheetSelectorsText } from '../../../app/components/Views/MultichainAccounts/shared/PermissionSummaryBottomSheet.testIds';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class SelectNetworksBottomSheet {
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

  async swipeToDismiss(): Promise<void> {
    await UnifiedGestures.swipe(this.connectedAccountsText, 'down', {
      elemDescription: 'Networks Bottom Sheet',
      speed: 'fast',
      percentage: 0.6,
    });
  }

  async longPressOnNetwork(networkName: string): Promise<void> {
    const networkElement = Matchers.getElementByText(networkName);
    await UnifiedGestures.longPress(networkElement, {
      elemDescription: `Network: ${networkName}`,
    });
  }
}

export default new SelectNetworksBottomSheet();
