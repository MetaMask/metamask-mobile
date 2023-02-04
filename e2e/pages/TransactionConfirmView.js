import TestHelpers from '../helpers';

const TRANSACTION_VIEW_CONTAINER_ID = 'txn-confirm-screen';
const TRANSACTION_AMOUNT_ID = 'confirm-txn-amount';
const CONFIRM_TRANSACTION_BUTTON_ID = 'txn-confirm-send-button';
const NAVBAR_TITLE_TEXT = 'navbar-title-text';
export default class TransactionConfirmationView {
  static async tapConfirmButton() {
    await TestHelpers.tap(CONFIRM_TRANSACTION_BUTTON_ID);
  }

  static async tapCancelButton() {
    await TestHelpers.tapByText('Cancel');
  }

  static async isTransactionTotalCorrect(amount) {
    await TestHelpers.checkIfElementHasString(TRANSACTION_AMOUNT_ID, amount);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(TRANSACTION_VIEW_CONTAINER_ID);
  }
  static async isNetworkNameVisible(text) {
    await TestHelpers.checkIfElementHasString(NAVBAR_TITLE_TEXT, text);
  }
}
