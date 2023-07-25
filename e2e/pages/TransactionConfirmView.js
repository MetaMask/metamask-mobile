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
  EDIT_PRIORITY_SCREEN_TEST_ID,
  MAX_PRIORITY_FEE_INPUT_TEST_ID,
} from '../../wdio/screen-objects/testIDs/Screens/EditGasFeeScreen.testids.js';

import messages from '../../locales/languages/en.json';

const EDIT_GAS_FEE_AGGRESSIVE_TEXT = messages.edit_gas_fee_eip1559.aggressive;
const EDIT_GAS_FEE_ADVANCE_OPTIONS_TEXT =
  messages.edit_gas_fee_eip1559.advanced_options;
const EDIT_GAS_FEE_SAVE_BUTTON_TEXT = messages.edit_gas_fee_eip1559.save;
const EDIT_GAS_FEE_MARKET_TEXT = messages.edit_gas_fee_eip1559.market;
const EDIT_GAS_FEE_LOW_TEXT = messages.edit_gas_fee_eip1559.low;

const TRANSACTION_CONFIRMATION_CANCEL_BUTTON_TEXT = messages.transaction.cancel;

export default class TransactionConfirmationView {
  static async tapConfirmButton() {
    if (device.getPlatform() === 'ios') {
      await TestHelpers.waitAndTap(CONFIRM_TRANSACTION_BUTTON_ID);
    } else {
      await TestHelpers.delay(5000);
      await TestHelpers.waitAndTapByLabel(CONFIRM_TRANSACTION_BUTTON_ID);
    }
  }

  static async tapCancelButton() {
    await TestHelpers.tapByText(TRANSACTION_CONFIRMATION_CANCEL_BUTTON_TEXT);
  }

  static async tapEstimatedGasLink() {
    await TestHelpers.tap(ESTIMATED_FEE_TEST_ID);
  }

  static async tapLowPriorityGasOption() {
    await TestHelpers.tapByText(EDIT_GAS_FEE_LOW_TEXT);
  }

  static async tapMarketPriorityGasOption() {
    await TestHelpers.tapByText(EDIT_GAS_FEE_MARKET_TEXT);
  }

  static async tapAggressivePriorityGasOption() {
    await TestHelpers.tapByText(EDIT_GAS_FEE_AGGRESSIVE_TEXT);
  }

  static async tapAdvancedOptionsPriorityGasOption() {
    await TestHelpers.tapByText(EDIT_GAS_FEE_ADVANCE_OPTIONS_TEXT);
  }

  static async isTransactionTotalCorrect(amount) {
    if (device.getPlatform() === 'ios') {
      await TestHelpers.checkIfElementHasString(COMFIRM_TXN_AMOUNT, amount);
    } else {
      await TestHelpers.checkIfElementWithTextIsVisible(amount);
    }
  }

  static async isPriorityEditScreenVisible() {
    await TestHelpers.checkIfVisible(EDIT_PRIORITY_SCREEN_TEST_ID);
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
    await TestHelpers.tapByText(EDIT_GAS_FEE_SAVE_BUTTON_TEXT);
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
