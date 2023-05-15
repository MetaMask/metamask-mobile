import TestHelpers from '../helpers';
import {
  COMFIRM_TXN_AMOUNT,
  CONFIRM_TRANSACTION_BUTTON_ID,
  NAVBAR_TITLE_TEXT,
  TRANSACTION_ACCOUNT_BALANCE,
  TRANSACTION_VIEW_CONTAINER_ID,
} from '../../wdio/screen-objects/testIDs/Screens/TransactionConfirm.testIds';
import { ESTIMATED_FEE_TEST_ID } from '../../wdio/screen-objects/testIDs/Screens/TransactionSummaryScreen.testIds.js';
import {
  EDIT_PRIOTIRY_SCREEN_TEST_ID,
  MAX_PRIORITY_FEE_INPUT_TEST_ID,
} from '../../wdio/screen-objects/testIDs/Screens/EditGasFeeScreen.testids.js';

export default class TransactionConfirmationView {
  static async tapConfirmButton() {
    await TestHelpers.waitAndTap(CONFIRM_TRANSACTION_BUTTON_ID);
  }

  static async tapCancelButton() {
    await TestHelpers.tapByText('Cancel');
  }

  static async tapEstimatedGasLink() {
    await TestHelpers.tap(ESTIMATED_FEE_TEST_ID);
  }

  static async tapLowPriorityGasOption() {
    await TestHelpers.tapByText('Low');
  }

  static async tapMarketPriorityGasOption() {
    await TestHelpers.tapByText('Market');
  }

  static async tapAggressivePriorityGasOption() {
    await TestHelpers.tapByText('Aggressive');
  }

  static async tapAdvancedOptionsPriorityGasOption() {
    await TestHelpers.tapByText('Advanced options');
  }

  static async isTransactionTotalCorrect(amount) {
    await TestHelpers.checkIfElementHasString(COMFIRM_TXN_AMOUNT, amount);
  }

  static async isPriorityEditScreenVisible() {
    await TestHelpers.checkIfVisible(EDIT_PRIOTIRY_SCREEN_TEST_ID);
  }

  static async isMaxPriorityFeeCorrect(amount) {
    await TestHelpers.checkIfElementHasString(
      MAX_PRIORITY_FEE_INPUT_TEST_ID,
      amount,
    );
  }

  static async isAmountVisible(amount) {
    await TestHelpers.checkIfElementWithTextIsVisible(amount);
  }

  static async tapMaxPriorityFeeSaveButton() {
    await TestHelpers.tapByText('Save');
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(TRANSACTION_VIEW_CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(TRANSACTION_VIEW_CONTAINER_ID);
  }

  static async isBalanceVisible() {
    await TestHelpers.checkIfVisible(TRANSACTION_ACCOUNT_BALANCE);
  }

  static async isBalanceNotVisible() {
    await TestHelpers.checkIfNotVisible(TRANSACTION_ACCOUNT_BALANCE);
  }

  static async isNetworkNameVisible(text) {
    await TestHelpers.checkIfElementHasString(NAVBAR_TITLE_TEXT, text);
  }
}
