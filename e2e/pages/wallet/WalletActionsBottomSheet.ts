import { WalletActionsBottomSheetSelectorsIDs } from '../../selectors/wallet/WalletActionsBottomSheet.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

class WalletActionsBottomSheet {
  get swapButton(): DetoxElement {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.SWAP_BUTTON,
    );
  }

  async tapSwapButton(): Promise<void> {
    await Gestures.waitAndTap(this.swapButton, {
      delay: 1000,
    });
  }

  async swipeDownActionsBottomSheet(): Promise<void> {
    await Gestures.swipe(this.swapButton, 'down', {
      speed: 'fast',
    });
  }
}

export default new WalletActionsBottomSheet();
