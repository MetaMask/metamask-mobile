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
    if (device.getPlatform() === 'ios') {
      await TestHelpers.waitAndTap(TRANSACTION_NEXT_BUTTON_ID);
    } else {
      await TestHelpers.waitAndTapByLabel(TRANSACTION_NEXT_BUTTON_ID);
    }
  }

  static async typeInTransactionAmount(amount) {
    if (device.getPlatform === 'android') {
      await TestHelpers.typeTextAndHideKeyboard(TRANSACTION_INPUT_ID, amount);
    } else {
      await TestHelpers.replaceTextInField(TRANSACTION_INPUT_ID, amount);
    }
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
    if (device.getPlatform() === 'ios') {
      await TestHelpers.waitAndTap(CURRENCY_SWITCH);
    } else {
      /* In this particular instance the test is unable to tap on the currency switch button
      because the keyboard is obstructing the element from being tappable.
      Unfortunately, the android keyboard does not close with the new line character.
      Here is random tap on the screen to close the keyboard
      */
      await element(by.id(CURRENCY_SWITCH)).tap({ x: 150, y: 100 });

      await TestHelpers.waitAndTap(CURRENCY_SWITCH);
    }
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
