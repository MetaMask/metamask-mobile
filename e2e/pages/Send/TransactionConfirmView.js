import TestHelpers from '../../helpers.js';
import {
  COMFIRM_TXN_AMOUNT,
  CONFIRM_TRANSACTION_BUTTON_ID,
  NAVBAR_TITLE_NETWORKS_TEXT,
  TRANSACTION_VIEW_CONTAINER_ID,
} from '../../../wdio/screen-objects/testIDs/Screens/TransactionConfirm.testIds.js';
import { ESTIMATED_FEE_TEST_ID } from '../../../wdio/screen-objects/testIDs/Screens/TransactionSummaryScreen.testIds.js';
import {
  EDIT_PRIORITY_SCREEN_TEST_ID,
  MAX_PRIORITY_FEE_INPUT_TEST_ID,
} from '../../../wdio/screen-objects/testIDs/Screens/EditGasFeeScreen.testids.js';
import { EditGasViewSelectorsText } from '../../selectors/EditGasView.selectors.js';
import { TransactionConfirmViewSelectorsText } from '../../selectors/TransactionConfirmView.selectors.js';

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
    await TestHelpers.tapByText(
      TransactionConfirmViewSelectorsText.CANCEL_BUTTON,
    );
  }

  static async tapEstimatedGasLink() {
    await TestHelpers.tap(ESTIMATED_FEE_TEST_ID);
  }

  static async tapLowPriorityGasOption() {
    await TestHelpers.tapByText(EditGasViewSelectorsText.LOW);
  }

  static async tapMarketPriorityGasOption() {
    await TestHelpers.tapByText(EditGasViewSelectorsText.MARKET);
  }

  static async tapAggressivePriorityGasOption() {
    await TestHelpers.tapByText(EditGasViewSelectorsText.AGGRESSIVE);
  }

  static async tapAdvancedOptionsPriorityGasOption() {
    await TestHelpers.tapByText(EditGasViewSelectorsText.ADVANCE_OPTIONS);
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
    await TestHelpers.tapByText(EditGasViewSelectorsText.SAVE_BUTTON);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(TRANSACTION_VIEW_CONTAINER_ID);
  }

  static async isNetworkNameVisible(text) {
    await TestHelpers.checkIfElementHasString(NAVBAR_TITLE_NETWORKS_TEXT, text);
  }
}
