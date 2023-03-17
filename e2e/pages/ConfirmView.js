import TestHelpers from '../helpers';

const CONFIRM_SEND_BUTTON = 'txn-confirm-send-button';

export default class ConfirmView {
  static async isAmountVisible(amount) {
    await TestHelpers.checkIfElementWithTextIsVisible(amount);
  }
  static async tapSendButton() {
    await TestHelpers.tap(CONFIRM_SEND_BUTTON);
  }
}
