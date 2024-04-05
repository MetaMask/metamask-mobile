import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  AMOUNT_ERROR,
  AMOUNT_SCREEN,
  NEXT_BUTTON,
  TRANSACTION_AMOUNT_INPUT,
} from './testIDs/Screens/AmountScreen.testIds';

class AmountScreen {
  get amountInputField() {
    return Selectors.getElementByPlatform(TRANSACTION_AMOUNT_INPUT);
  }

  get amountScreen() {
    return Selectors.getElementByPlatform(AMOUNT_SCREEN);
  }

  get amountError() {
    return Selectors.getElementByPlatform(AMOUNT_ERROR);
  }

  get nextButton() {
    return Selectors.getElementByPlatform(NEXT_BUTTON);
  }

  async enterAmount(text) {
    await Gestures.waitAndTap(this.amountInputField);
    await Gestures.typeText(this.amountInputField, text);
  }

  async isTokenCorrect(token) {
    expect(this.confirmAmount).toHaveText(token);
  }

  async waitForAmountErrorMessage() {
    const amountError = await this.amountError;
    await amountError.waitForDisplayed();
  }

  async waitNextButtonEnabled() {
    const nextButton = await this.nextButton;
    await nextButton.waitForEnabled();
  }
}

export default new AmountScreen();
