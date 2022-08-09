import TestHelpers from '../helpers';

const TRANSACTION_INPUT_ID = 'txn-amount-input';
const TRANSACTION_NEXT_BUTTON_ID = 'txn-amount-next-button';
const TRANSACTION_INSUFFICIENT_FUNDS_ERROR_ID = 'amount-error';

export default class AmountView {
  static async tapNextButton() {
    await TestHelpers.tap(TRANSACTION_NEXT_BUTTON_ID);
  }

  static async typeInTransactionAmount(amount) {
    await TestHelpers.replaceTextInField(TRANSACTION_INPUT_ID, amount);
  }

  static async isVisible() {
    await TestHelpers.checkIfElementWithTextIsVisible('Amount');
  }

  static async isInsufficientFundsErrorVisible() {
    await TestHelpers.checkIfVisible(TRANSACTION_INSUFFICIENT_FUNDS_ERROR_ID);
  }
}
