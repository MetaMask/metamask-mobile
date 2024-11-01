import {
  DeleteWalletModalSelectorsIDs,
  DeleteWalletModalSelectorsText,
} from '../../../selectors/Settings/SecurityAndPrivacy/DeleteWalletModal.selectors';
import Matchers from '../../../utils/Matchers';
import Gestures from '../../../utils/Gestures';

class DeleteWalletModal {
  get container() {
    return Matchers.getElementByID(DeleteWalletModalSelectorsIDs.CONTAINER);
  }

  get understandButton() {
    return Matchers.getElementByText(
      DeleteWalletModalSelectorsText.UNDERSTAND_BUTTON,
    );
  }

  get deleteWalletButton() {
    return Matchers.getElementByText(DeleteWalletModalSelectorsText.DELETE_MY);
  }

  get deleteInput() {
    return Matchers.getElementByID(DeleteWalletModalSelectorsIDs.INPUT);
  }

  async tapIUnderstandButton() {
    await Gestures.waitAndTap(this.understandButton);
  }

  async tapDeleteMyWalletButton() {
    await Gestures.waitAndTap(this.deleteWalletButton);
  }

  async typeDeleteInInputBox() {
    await Gestures.typeTextAndHideKeyboard(this.deleteInput, 'delete');
  }
}

export default new DeleteWalletModal();
