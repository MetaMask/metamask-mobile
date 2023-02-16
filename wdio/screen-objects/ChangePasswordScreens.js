import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  RESET_PASSWORD_INPUT_ID,
  RESET_PASSWORD_CONFIRM_BUTTON_ID,
  RESET_PASSWORD_ANDROID_TERM_CHECKBOX_ID,
} from './testIDs/Screens/ChangePasswordScreensIDs.testIds';

class ChangePasswordScreens {
  get passwordInput() {
    return Selectors.getElementByPlatform(RESET_PASSWORD_INPUT_ID);
  }
  get confirmButton() {
    return Selectors.getElementByPlatform(RESET_PASSWORD_CONFIRM_BUTTON_ID);
  }
  get termsAndConditionCheckBox() {
    return Selectors.getElementByPlatform(
      RESET_PASSWORD_ANDROID_TERM_CHECKBOX_ID,
    );
  }
  async typePassword(text) {
    const elem = await this.passwordInput;
    await elem.waitForDisplayed();
    await Gestures.typeText(elem, text);
  }
  async tapConfirmButton() {
    // await Gestures.tap(this.buttonCONFIRM);
    await driver.hideKeyboard();
    await Gestures.tap(this.confirmButton);
    await Gestures.tap(this.confirmButton);
  }
  async tapUnderstandTerms() {
    await Gestures.tap(this.termsAndConditionCheckBox);
    await Gestures.tap(this.termsAndConditionCheckBox);
  }
}

export default new ChangePasswordScreens();
