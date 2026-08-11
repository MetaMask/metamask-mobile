import { PermissionSummaryBottomSheetSelectorsText } from '../../../app/components/Views/MultichainAccounts/shared/PermissionSummaryBottomSheet.testIds';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { EncapsulatedElementType } from '../../framework';

class SelectNetworksBottomSheet {
  get connectedAccountsText(): EncapsulatedElementType {
    return Matchers.getElementByText(
      PermissionSummaryBottomSheetSelectorsText.CONNECTED_ACCOUNTS_TEXT,
    );
  }

  async swipeToDismiss(): Promise<void> {
    await Gestures.swipe(this.connectedAccountsText, 'down', {
      elemDescription: 'Networks Bottom Sheet',
      speed: 'fast',
      percentage: 0.6,
    });
  }

  async longPressOnNetwork(networkName: string): Promise<void> {
    const networkElement = Matchers.getElementByText(networkName);
    await Gestures.longPress(networkElement, {
      elemDescription: `Network: ${networkName}`,
    });
  }
}

export default new SelectNetworksBottomSheet();
