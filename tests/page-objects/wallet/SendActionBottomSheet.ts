import { SendActionViewSelectorsIDs } from '../../selectors/SendFlow/SendActionView.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

class SendActionBottomSheet {
  get solanaAddressInputField(): DetoxElement {
    return Matchers.getElementByID(
      SendActionViewSelectorsIDs.SOLANA_INPUT_ADDRESS_FIELD,
    );
  }

  get solanaAmountInputField(): DetoxElement {
    return Matchers.getElementByID(
      SendActionViewSelectorsIDs.SOLANA_INPUT_AMOUNT_FIELD,
    );
  }

  get invalidAddressError(): DetoxElement {
    return Matchers.getElementByID(
      SendActionViewSelectorsIDs.INVALID_ADDRESS_ERROR,
    );
  }

  get continueButton(): DetoxElement {
    return Matchers.getElementByID(SendActionViewSelectorsIDs.CONTINUE_BUTTON);
  }

  get cancelButton(): DetoxElement {
    return Matchers.getElementByID(SendActionViewSelectorsIDs.CANCEL_BUTTON);
  }

  get closeModalButton(): DetoxElement {
    return Matchers.getElementByID(SendActionViewSelectorsIDs.CLOSE_BUTTON);
  }

  get sendSOLTransactionButton(): DetoxElement {
    return Matchers.getElementByID(
      SendActionViewSelectorsIDs.SEND_TRANSACTION_BUTTON,
    );
  }

  async sendActionInputAddress(address: string) {
    await Gestures.typeText(this.solanaAddressInputField, address, {
      hideKeyboard: true,
      elemDescription: 'Solana address input field',
    });
  }

  async sendActionInputAmount(amount: string) {
    await Gestures.typeText(this.solanaAmountInputField, amount, {
      hideKeyboard: true,
    });
  }

  async tapSendSOLTransactionButton() {
    await Gestures.waitAndTap(this.sendSOLTransactionButton, {
      delay: 1500,
      elemDescription: 'Send SOL transaction button',
    });
  }

  async tapCancelButton() {
    await Gestures.waitAndTap(this.cancelButton);
  }

  async tapContinueButton() {
    await Gestures.waitAndTap(this.continueButton, {
      delay: 1000,
    });
  }

  async tapCloseButton() {
    await Gestures.waitAndTap(this.closeModalButton);
  }
}

export default new SendActionBottomSheet();
