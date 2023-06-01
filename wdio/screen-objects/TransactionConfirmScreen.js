import Selectors from '../helpers/Selectors';
import {
  COMFIRM_TXN_AMOUNT,
  CONFIRM_TRANSACTION_BUTTON_ID,
} from './testIDs/Screens/TransactionConfirm.testIds';
import { ESTIMATED_FEE_TEST_ID } from './testIDs/Screens/TransactionSummaryScreen.testIds';
import { MAX_PRIORITY_FEE_INPUT_TEST_ID, SAVE_GAS_FEE_TEST_ID } from './testIDs/Screens/EditGasFeeScreen.testids';
import Gestures from '../helpers/Gestures';

class TransactionConfirmScreen {
  get confirmAmount() {
    return Selectors.getElementByPlatform(COMFIRM_TXN_AMOUNT);
  }

  get sendButton() {
    return Selectors.getElementByPlatform(CONFIRM_TRANSACTION_BUTTON_ID);
  }

  get estimatedGasLink() {
    return Selectors.getElementByPlatform(ESTIMATED_FEE_TEST_ID);
  }

  get eip1559GasOptions() {
    return Selectors.getElementByPlatform(MAX_PRIORITY_FEE_INPUT_TEST_ID);

  }

  get saveGasButton() {
    return Selectors.getElementByPlatform(SAVE_GAS_FEE_TEST_ID);
  }

  async isCorrectTokenConfirm(token) {
    const confirmAmount = await this.confirmAmount;
    await confirmAmount.waitForDisplayed();
    expect(confirmAmount).toHaveTextContaining(token);
  }

  async isCorrectTokenAmountDisplayed(amount) {
    const confirmAmount = await this.confirmAmount;
    await confirmAmount.waitForDisplayed();
    expect(confirmAmount).toHaveTextContaining(amount);
  }

  async isConfirmScreenVisible() {
    const confirmAmount = await this.confirmAmount;
    await confirmAmount.waitForDisplayed();
  }

  async tapSendButton() {
    const sendButton = await this.sendButton;
    await sendButton.waitForDisplayed();

    while (await sendButton.isExisting()) {
      await Gestures.waitAndTap(this.sendButton);
      await driver.pause(3000);
    }
  }

  async tapEstimatedGasLink() {
    await Gestures.waitAndTap(this.estimatedGasLink);
  }

  async areEip1559GasOptionsNotVisible() {
    const eip1559GasOptions = await this.eip1559GasOptions;
    await eip1559GasOptions.waitForExist({ reverse: true });
  }

  async tapSaveGasButton() {
    await Gestures.tapTextByXpath('Save');
  }


}

export default new TransactionConfirmScreen();
