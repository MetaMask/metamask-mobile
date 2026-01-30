import { PermissionSummaryBottomSheetSelectorsText } from '../../../app/components/Views/AccountConnect/PermissionSummaryBottomSheet.testIds';
import Gestures from '../../../tests/framework/Gestures';
import Matchers from '../../../tests/framework/Matchers';

class SelectNetworksBottomSheet {
  get connectedAccountsText(): DetoxElement {
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
