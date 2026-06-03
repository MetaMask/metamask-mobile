import { SendActionViewSelectorsIDs } from '../../selectors/SendFlow/SendActionView.selectors';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class SendActionBottomSheet {
  get solanaAddressInputField(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          SendActionViewSelectorsIDs.SOLANA_INPUT_ADDRESS_FIELD,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SendActionViewSelectorsIDs.SOLANA_INPUT_ADDRESS_FIELD,
        ),
    });
  }

  get solanaAmountInputField(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          SendActionViewSelectorsIDs.SOLANA_INPUT_AMOUNT_FIELD,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SendActionViewSelectorsIDs.SOLANA_INPUT_AMOUNT_FIELD,
        ),
    });
  }

  get invalidAddressError(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          SendActionViewSelectorsIDs.INVALID_ADDRESS_ERROR,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SendActionViewSelectorsIDs.INVALID_ADDRESS_ERROR,
        ),
    });
  }

  get continueButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(SendActionViewSelectorsIDs.CONTINUE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SendActionViewSelectorsIDs.CONTINUE_BUTTON,
        ),
    });
  }

  get cancelButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(SendActionViewSelectorsIDs.CANCEL_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SendActionViewSelectorsIDs.CANCEL_BUTTON,
        ),
    });
  }

  get closeModalButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(SendActionViewSelectorsIDs.CLOSE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SendActionViewSelectorsIDs.CLOSE_BUTTON,
        ),
    });
  }

  get sendSOLTransactionButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          SendActionViewSelectorsIDs.SEND_TRANSACTION_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SendActionViewSelectorsIDs.SEND_TRANSACTION_BUTTON,
        ),
    });
  }

  async sendActionInputAddress(address: string) {
    await UnifiedGestures.typeText(this.solanaAddressInputField, address, {
      hideKeyboard: true,
      elemDescription: 'Solana address input field',
    });
  }

  async sendActionInputAmount(amount: string) {
    await UnifiedGestures.typeText(this.solanaAmountInputField, amount, {
      hideKeyboard: true,
    });
  }

  async tapSendSOLTransactionButton() {
    await UnifiedGestures.waitAndTap(this.sendSOLTransactionButton, {
      delay: 1500,
      elemDescription: 'Send SOL transaction button',
    });
  }

  async tapCancelButton() {
    await UnifiedGestures.waitAndTap(this.cancelButton);
  }

  async tapContinueButton() {
    await UnifiedGestures.waitAndTap(this.continueButton, {
      delay: 1000,
    });
  }

  async tapCloseButton() {
    await UnifiedGestures.waitAndTap(this.closeModalButton);
  }
}

export default new SendActionBottomSheet();
