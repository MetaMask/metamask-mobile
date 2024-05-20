import TestHelpers from '../../helpers.js';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';
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

class TransactionConfirmationView {
  get confirmButton() {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(CONFIRM_TRANSACTION_BUTTON_ID)
      : Matchers.getElementByLabel(CONFIRM_TRANSACTION_BUTTON_ID);
  }

  get cancelButton() {
    return Matchers.getElementByText(
      TransactionConfirmViewSelectorsText.CANCEL_BUTTON,
    );
  }

  get estimatedGasLink() {
    return Matchers.getElementByID(ESTIMATED_FEE_TEST_ID);
  }

  get transactionViewContainer() {
    return Matchers.getElementByID(TRANSACTION_VIEW_CONTAINER_ID);
  }

  async tapConfirmButton() {
    await Gestures.waitAndTap(await this.confirmButton);
  }

  async tapCancelButton() {
    await Gestures.waitAndTap(this.cancelButton);
  }

  async tapEstimatedGasLink() {
    await Gestures.waitAndTap(this.estimatedGasLink);
  }

  async tapPriorityGasOption(priority) {
    await Gestures.waitAndTapByText(
      EditGasViewSelectorsText[priority.toUpperCase()],
    );
  }

  async tapMaxPriorityFeeSaveButton() {
    await Gestures.waitAndTapByText(EditGasViewSelectorsText.SAVE_BUTTON);
  }

  async isVisible() {
    await TestHelpers.checkIfVisible(this.transactionViewContainer);
  }

  async isNetworkNameVisible(text) {
    await TestHelpers.checkIfElementHasString(NAVBAR_TITLE_NETWORKS_TEXT, text);
  }

  async isTransactionTotalCorrect(amount) {
    await TestHelpers.checkIfElementHasString(COMFIRM_TXN_AMOUNT, amount);
  }

  async isPriorityEditScreenVisible() {
    await TestHelpers.checkIfVisible(EDIT_PRIORITY_SCREEN_TEST_ID);
  }

  async isMaxPriorityFeeCorrect(amount) {
    await TestHelpers.checkIfElementHasString(
      MAX_PRIORITY_FEE_INPUT_TEST_ID,
      amount,
    );
  }

  async isAmountVisible(amount) {
    await TestHelpers.checkIfElementWithTextIsVisible(amount);
  }
}

export default new TransactionConfirmationView();
