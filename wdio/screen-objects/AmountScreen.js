import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  AMOUNT_SCREEN,
  TRANSACTION_AMOUNT_INPUT,
} from '../../wdio/screen-objects/testIDs/Screens/AmountScreen.testIds';

class AmountScreen {
  get amountInputField() {
    return Selectors.getElementByPlatform(TRANSACTION_AMOUNT_INPUT);
  }

  get amountScreen() {
    return Selectors.getElementByPlatform(AMOUNT_SCREEN);
  }

  async enterAmount(text) {
    await Gestures.waitAndTap(this.amountInputField);
    await Gestures.typeText(this.amountInputField, text);
  }

  async isTokenCorrect(token) {
    const element = await this.confirmAmount;
    expect(await element.getText()).toContain(token);
  }

  async isCorrectTokenAmountDisplayed(amount) {
    const element = await this.confirmAmount;
    expect(await element.getText()).toContain(amount);
  }
}

export default new AmountScreen();
