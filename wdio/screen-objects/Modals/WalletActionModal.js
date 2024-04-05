import Selectors from '../../helpers/Selectors';
import {
  WALLET_RECEIVE_ACTION_BUTTON,
  WALLET_SEND_ACTION_BUTTON,
} from '../testIDs/Components/WalletActionModal.testIds';
import Gestures from '../../helpers/Gestures';

class WalletActionModal {
  get sendButton() {
    return Selectors.getElementByPlatform(WALLET_SEND_ACTION_BUTTON);
  }

  get receiveButton() {
    return Selectors.getElementByPlatform(WALLET_RECEIVE_ACTION_BUTTON);
  }

  async tapSendButton() {
    await Gestures.waitAndTap(this.sendButton);
  }

  async tapReceiveButton() {
    await Gestures.waitAndTap(this.receiveButton);
  }
}

export default new WalletActionModal();
