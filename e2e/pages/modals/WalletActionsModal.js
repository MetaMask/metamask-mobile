import { WalletActionsModalSelectorsIDs } from '../../selectors/Modals/WalletActionsModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class WalletActionsModal {
  get sendButton() {
    return Matchers.getElementByID(WalletActionsModalSelectorsIDs.SEND_BUTTON);
  }

  get receiveButton() {
    return Matchers.getElementByID(
      WalletActionsModalSelectorsIDs.RECEIVE_BUTTON,
    );
  }

  get swapButton() {
    return Matchers.getElementByID(WalletActionsModalSelectorsIDs.SWAP_BUTTON);
  }

  get buyButton() {
    return Matchers.getElementByID(WalletActionsModalSelectorsIDs.BUY_BUTTON);
  }

  get sellButton() {
    return Matchers.getElementByID(WalletActionsModalSelectorsIDs.SELL_BUTTON);
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

export default new WalletActionsModal();
