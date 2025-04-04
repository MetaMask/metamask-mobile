import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import { WalletActionsBottomSheetSelectorsIDs } from '../../../e2e/selectors/wallet/WalletActionsBottomSheet.selectors';

class WalletActionModal {
  get sendButton() {
    return Selectors.getElementByPlatform(WalletActionsBottomSheetSelectorsIDs.SEND_BUTTON);
  }

  get receiveButton() {
    return Selectors.getElementByPlatform(WalletActionsBottomSheetSelectorsIDs.RECEIVE_BUTTON);
  }

  async tapSendButton() {
    await Gestures.waitAndTap(this.sendButton);
  }

  async tapReceiveButton() {
    await Gestures.waitAndTap(this.receiveButton);
  }
}

export default new WalletActionModal();
