import TestHelpers from '../helpers';
import {
  CURRENCY_SWITCH,
  TRANSACTION_AMOUNT_CONVERSION_VALUE,
  TRANSACTION_AMOUNT_INPUT,
} from '../../wdio/screen-objects/testIDs/Screens/AmountScreen.testIds';

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

  static async isTransactionAmountConversionValueCorrect(amount) {
    await TestHelpers.checkIfHasText(
      TRANSACTION_AMOUNT_CONVERSION_VALUE,
      amount,
    );
  }

  static isTransactionAmountCorrect(amount) {
    return TestHelpers.checkIfHasText(TRANSACTION_AMOUNT_INPUT, amount);
  }

  static async tapCurrencySwitch() {
    await TestHelpers.tap(CURRENCY_SWITCH);
  }

  static async isVisible() {
    await TestHelpers.checkIfElementWithTextIsVisible('Amount');
  }

  static async isInsufficientFundsErrorVisible() {
    await TestHelpers.checkIfVisible(TRANSACTION_INSUFFICIENT_FUNDS_ERROR_ID);
  }

  static async isAmountErrorVisible() {
    await TestHelpers.checkIfVisible(TRANSACTION_INSUFFICIENT_FUNDS_ERROR_ID);
  }
}
