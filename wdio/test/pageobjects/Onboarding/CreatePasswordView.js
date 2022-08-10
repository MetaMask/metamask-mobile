import Gestures from '../Gestures';
// import {
//   CREATE_PASSWORD_CONTAINER_ID,
//   CREATE_PASSWORD_INPUT_BOX_ID,
//   CONFIRM_PASSWORD_INPUT_BOX_ID,
//   IOS_I_UNDERSTAND_BUTTON_ID,
//   ANDROID_I_UNDERSTAND_BUTTON_ID,
// } from '../../../../app/constants/test-ids';

const CREATE_PASSWORD_CONTAINER_ID = 'create-password-screen';
const CREATE_PASSWORD_INPUT_BOX_ID = 'create-password-first-input-field';
const CONFIRM_PASSWORD_INPUT_BOX_ID = 'create-password-second-input-field';
const CREATE_PASSWORD_BUTTON_ID = 'submit-button';
const REMEMBER_ME_ID = 'remember-me-toggle';
const IOS_I_UNDERSTAND_BUTTON_ID = 'password-understand-box';
const ANDROID_I_UNDERSTAND_BUTTON_ID = 'i-understand-text';
class CreatePasswordView {
  get CreatePasswordContainer() {
    return $(`~${CREATE_PASSWORD_CONTAINER_ID}`);
  }

  async toggleRememberMe() {
    await Gestures.tap(REMEMBER_ME_ID);
  }

  async enterPassword(password) {
    await Gestures.typeText(CREATE_PASSWORD_INPUT_BOX_ID, password);
  }

  async reEnterPassword(password) {
    await Gestures.typeText(CONFIRM_PASSWORD_INPUT_BOX_ID, password);
  }

  async tapIUnderstandCheckBox() {
    await Gestures.tap(IOS_I_UNDERSTAND_BUTTON_ID);
  }

  async tapCreatePasswordButton() {
    await Gestures.tap(CREATE_PASSWORD_BUTTON_ID);
  }

  // Assertions
  async isVisible() {
    await expect(this.CreatePasswordContainer).toBeDisplayed();
  }

  async isNotVisible() {
    await expect(this.CreatePasswordContainer).not.toBeDisplayed();
  }
}
export default new CreatePasswordView();
