import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';

class ChangePasswordScreens {
  get passwordInput() {
    return Selectors.getElementByPlatform('private-credential-password-input-field');
  }
  get buttonCONFIRM(){
    return Selectors.getElementByPlatform('submit-button');
  }
  get termsAndConditionCheckBox() {
    return Selectors.getElementByPlatform('i-understand-text');
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
