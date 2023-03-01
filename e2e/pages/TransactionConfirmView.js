import TestHelpers from '../helpers';
import { COMFIRM_TXN_AMOUNT } from '../../wdio/screen-objects/testIDs/Screens/TransactionConfirm.testIds';

const TRANSACTION_VIEW_CONTAINER_ID = 'txn-confirm-screen';
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
    await TestHelpers.checkIfElementHasString(COMFIRM_TXN_AMOUNT, amount);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(TRANSACTION_VIEW_CONTAINER_ID);
  }
  static async isNetworkNameVisible(text) {
    await TestHelpers.checkIfElementHasString(NAVBAR_TITLE_TEXT, text);
  }
}
