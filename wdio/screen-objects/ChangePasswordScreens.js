import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  RESET_PASSWORD_INPUT_ID,
  RESET_PASSWORD_CONFIRM_BUTTON_ID,
} from './testIDs/Screens/ChangePasswordScreensIDs.testIds';
import { I_UNDERSTAND_BUTTON_ID } from './testIDs/Screens/WalletSetupScreen.testIds';

class ChangePasswordScreens {
  get passwordInput() {
    return Selectors.getElementByPlatform(RESET_PASSWORD_INPUT_ID);
  }

  get confirmButton() {
    return Selectors.getElementByPlatform(RESET_PASSWORD_CONFIRM_BUTTON_ID);
  }

  get termsAndConditionCheckBox() {
    return Selectors.getXpathElementByResourceId(I_UNDERSTAND_BUTTON_ID);
  }

  async typePassword(text) {
    const elem = await this.passwordInput;
    await elem.waitForDisplayed();
    await Gestures.typeText(elem, text);
  }

  async tapConfirmButton() {
    // await Gestures.tap(this.buttonCONFIRM);
    await driver.hideKeyboard();
    await Gestures.waitAndTap(this.confirmButton);
    await Gestures.waitAndTap(this.confirmButton);
  }

  async tapUnderstandTerms() {
    await Gestures.waitAndTap(this.termsAndConditionCheckBox);
  }
}

export default new ChangePasswordScreens();
