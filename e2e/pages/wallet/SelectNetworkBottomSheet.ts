import { PermissionSummaryBottomSheetSelectorsText } from '../../selectors/Browser/PermissionSummaryBottomSheet.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

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
