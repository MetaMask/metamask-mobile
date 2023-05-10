import Selectors from '../helpers/Selectors';
import {
  COMFIRM_TXN_AMOUNT,
  CONFIRM_TRANSACTION_BUTTON_ID,
} from './testIDs/Screens/TransactionConfirm.testIds';
import Gestures from '../helpers/Gestures';

class TransactionConfirmScreen {
  get confirmAmount() {
    return Selectors.getElementByPlatform(COMFIRM_TXN_AMOUNT);
  }

  get sendButton() {
    return Selectors.getElementByPlatform(CONFIRM_TRANSACTION_BUTTON_ID);
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
    await Gestures.waitAndTap(this.sendButton);
  }
}

export default new TransactionConfirmScreen();
