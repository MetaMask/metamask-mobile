import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  RESET_PASSWORD_INPUT_ID,
  RESET_PASSWORD_CONFIRM_BUTTON_ID,
  RESET_PASSWORD_TERM_CHECKBOX_ID,
} from './testIDs/Screens/ChangePasswordScreensIDs.testIds';


class ChangePasswordScreens {
  get passwordInput() {
    return Selectors.getElementByPlatform(RESET_PASSWORD_INPUT_ID);
  }
  get buttonCONFIRM(){
    return Selectors.getElementByPlatform(RESET_PASSWORD_CONFIRM_BUTTON_ID);
  }
  get termsAndConditionCheckBox() {
    return Selectors.getElementByPlatform(RESET_PASSWORD_TERM_CHECKBOX_ID);
  }
  async typePassword(text) {
    const elem = await (this.passwordInput);
    await elem.waitForDisplayed();
    await Gestures.typeText(elem, text);
  }
  async tapCONFIRM(){
    // await Gestures.tap(this.buttonCONFIRM);
    await driver.hideKeyboard();
    await Gestures.tap(this.buttonCONFIRM);
    await Gestures.tap(this.buttonCONFIRM);
  }
  async tapUnderstandTerms(){
    await Gestures.tap(this.termsAndConditionCheckBox);
    await Gestures.tap(this.termsAndConditionCheckBox);
  }
}

export default new ChangePasswordScreens();
