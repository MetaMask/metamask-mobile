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

  async tapSendButton() {
    await Gestures.waitAndTap(this.sendButton);
  }

  async tapReceiveButton() {
    await Gestures.waitAndTap(this.receiveButton);
  }

  async tapSwapButton() {
    await Gestures.waitAndTap(this.swapButton);
  }
}

export default new WalletActionsModal();
