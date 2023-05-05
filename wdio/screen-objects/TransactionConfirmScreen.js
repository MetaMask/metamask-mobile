import Selectors from '../helpers/Selectors';
import { COMFIRM_TXN_AMOUNT } from './testIDs/Screens/TransactionConfirm.testIds';

class TransactionConfirmScreen {
  get confirmAmount() {
    return Selectors.getElementByPlatform(COMFIRM_TXN_AMOUNT);
  }

  async isCorrectTokenConfirm(token) {
    expect(this.confirmAmount).toHaveTextContaining(token);
  }

  async isCorrectTokenAmountDisplayed(amount) {
    expect(this.confirmAmount).toHaveTextContaining(amount);
  }

  async isConfirmScreenVisible() {
    expect(await this.confirmAmount).toBeDisplayed();
  }
}
export default new TransactionConfirmScreen();
