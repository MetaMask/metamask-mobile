import { WalletActionsBottomSheetSelectorsIDs } from '../../selectors/wallet/WalletActionsBottomSheet.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class WalletActionsBottomSheet {
  get sendButton() {
    return Matchers.getElementByID(WalletActionsBottomSheetSelectorsIDs.SEND_BUTTON);
  }

  get receiveButton() {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.RECEIVE_BUTTON,
    );
  }

  get swapButton() {
    return Matchers.getElementByID(WalletActionsBottomSheetSelectorsIDs.SWAP_BUTTON);
  }

  get buyButton() {
    return Matchers.getElementByID(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON);
  }

  get sellButton() {
    return Matchers.getElementByID(WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON);
  }

  async tapSendButton() {
    await Gestures.waitAndTap(this.sendButton);
  }

  async tapReceiveButton() {
    await Gestures.waitAndTap(this.receiveButton);
  }

  async tapSwapButton() {
    await Gestures.waitAndTap(this.swapButton);
  }

  async tapBuyButton() {
    await Gestures.waitAndTap(this.buyButton);
  }

  async tapSellButton() {
    await Gestures.waitAndTap(this.sellButton);
  }
}

export default new WalletActionsBottomSheet();
