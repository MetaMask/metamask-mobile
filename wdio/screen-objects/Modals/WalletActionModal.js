import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import {WalletActionsModalSelectorsIDs} from "../../../e2e/selectors/Modals/WalletActionsModal.selectors";

class WalletActionModal {
  get sendButton() {
    return Selectors.getElementByPlatform(WalletActionsModalSelectorsIDs.SEND_BUTTON);
  }

  get receiveButton() {
    return Selectors.getElementByPlatform(WalletActionsModalSelectorsIDs.RECEIVE_BUTTON);
  }

  async tapSendButton() {
    await Gestures.waitAndTap(this.sendButton);
  }

  async tapReceiveButton() {
    await Gestures.waitAndTap(this.receiveButton);
  }
}

export default new WalletActionModal();
