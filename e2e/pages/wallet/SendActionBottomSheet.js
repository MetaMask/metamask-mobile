import { SendActionViewSelectorsIDs } from '../../selectors/SendFlow/SendActionView.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

class SendActionBottomSheet {
  get solanaAddressInputField() {
    return Matchers.getElementByID(
      SendActionViewSelectorsIDs.SOLANA_INPUT_ADDRESS_FIELD,
    );
  }

  get solanaAmountInputField() {
    return Matchers.getElementByID(
      SendActionViewSelectorsIDs.SOLANA_INPUT_AMOUNT_FIELD,
    );
  }

  get invalidAddressError() {
    return Matchers.getElementByID(
      SendActionViewSelectorsIDs.INVALID_ADDRESS_ERROR,
    );
  }

  get continueButton() {
    return Matchers.getElementByID(SendActionViewSelectorsIDs.CONTINUE_BUTTON);
  }

  get cancelButton() {
    return Matchers.getElementByID(SendActionViewSelectorsIDs.CANCEL_BUTTON);
  }

  get closeModalButton() {
    return Matchers.getElementByID(SendActionViewSelectorsIDs.CLOSE_BUTTON);
  }

  get sendSOLTransactionButton() {
    return Matchers.getElementByID(
      SendActionViewSelectorsIDs.SEND_TRANSACTION_BUTTON,
    );
  }

  async sendActionInputAddress(address) {
    await Gestures.typeTextAndHideKeyboard(
      this.solanaAddressInputField,
      address,
    );
  }

  async sendActionInputAmount(amount) {
    await Gestures.typeTextAndHideKeyboard(this.solanaAmountInputField, amount);
  }

  async tapSendSOLTransactionButton() {
    await Gestures.waitAndTap(this.sendSOLTransactionButton);
  }

  async tapCancelButton() {
    await Gestures.waitAndTap(this.cancelButton);
  }

  async tapContinueButton() {
    await Gestures.waitAndTap(this.continueButton, {
      skipVisibilityCheck: true,
    });
  }

  async tapCloseButton() {
    await Gestures.waitAndTap(this.closeModalButton);
  }
}

export default new SendActionBottomSheet();
