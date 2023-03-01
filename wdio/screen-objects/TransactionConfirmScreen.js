import Selectors from '../helpers/Selectors';
import { COMFIRM_TXN_AMOUNT } from './testIDs/Screens/TransactionConfirm.testIds';

class TransactionConfirmScreen {
  get confirmAmount() {
    return Selectors.getElementByPlatform(COMFIRM_TXN_AMOUNT);
  }

  async isCorrectTokenConfirm(token) {
    const element = await this.confirmAmount;
    expect(await element.getText()).toContain(token);
  }

  async isCorrectTokenAmountDisplayed(amount) {
    const element = await this.confirmAmount;
    expect(await element.getText()).toContain(amount);
  }

  async isConfirmScreenVisible() {
    expect(await this.confirmAmount).toBeDisplayed();
  }
}
export default new TransactionConfirmScreen();
