import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import { COMFIRM_TXN_AMOUNT, AMOUNT_SCREEN, TRANSACTION_AMOUNT_INPUT } from '../../wdio/screen-objects/testIDs/Screens/AmountScreen.testIds'

class AmountScreen {
    get confirmAmount() {
        return Selectors.getElementByPlatform(COMFIRM_TXN_AMOUNT);
      }

      get amountInputField() {
        return Selectors.getElementByPlatform(TRANSACTION_AMOUNT_INPUT);
      }

      get amountScreen() {
        return Selectors.getElementByPlatform(AMOUNT_SCREEN);
      }

      async isConfirmScreenVisible() {
        expect(await this.confirmAmount).toBeDisplayed();
      }
    
      async isCorrectTokenConfirm(token) {
        const element = await this.confirmAmount;
        expect(await element.getText()).toContain(token);
      }
    
      async isCorrectTokenAmountDisplayed(amount) {
        const element = await this.confirmAmount;
        expect(await element.getText()).toContain(amount);
      }

      async enterAmount(text) {
        await Gestures.tap(this.amountInputField);
        await Gestures.typeText(this.amountInputField, text);
      }
}
export default new AmountScreen();
