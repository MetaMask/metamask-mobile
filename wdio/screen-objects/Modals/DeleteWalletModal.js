import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';
import {
  DELETE_MODAL_UNDERSTAND_CONTINUE_ID,
  DELETE_MODAL_DELETE_INPUT_ID,
  DELETE_MODAL_DELETE_MY_WALLET_PERMANENTLY,
} from '../testIDs/Components/DeleteWalletModal.testIds';

class DeleteWalletModal {
  get iUnderstandContinueButton() {
    return Selectors.getElementByPlatform(DELETE_MODAL_UNDERSTAND_CONTINUE_ID);
  }

  get deleteInput() {
    return Selectors.getElementByPlatform(DELETE_MODAL_DELETE_INPUT_ID);
  }

  get deleteMyWalletButton() {
    return Selectors.getElementByPlatform(
      DELETE_MODAL_DELETE_MY_WALLET_PERMANENTLY,
    );
  }

  async tapIUnderstandContinue(text) {
    await Gestures.waitAndTap(this.iUnderstandContinueButton);
  }

  async typeTextDelete(deleteText) {
    await Gestures.typeText(this.deleteInput, deleteText, false);
  }

  async tapDeleteMyWallet() {
    await Gestures.waitAndTap(this.deleteMyWalletButton);
  }
}

export default new DeleteWalletModal();
