import Gestures from '../Gestures';
// import {
//   CREATE_PASSWORD_CONTAINER_ID,
//   CREATE_PASSWORD_INPUT_BOX_ID,
//   CONFIRM_PASSWORD_INPUT_BOX_ID,
//   IOS_I_UNDERSTAND_BUTTON_ID,
//   ANDROID_I_UNDERSTAND_BUTTON_ID,
// } from '../../../../app/constants/test-ids';
import {
  CREATE_PASSWORD_CONTAINER_ID,
  CREATE_PASSWORD_INPUT_BOX_ID,
  CONFIRM_PASSWORD_INPUT_BOX_ID,
  IOS_I_UNDERSTAND_BUTTON_ID,
  ANDROID_I_UNDERSTAND_BUTTON_ID,
  CREATE_PASSWORD_BUTTON_ID,
} from '../../../test-ids';

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
    return driver.capabilities.platformName === 'Android'
      ? await Gestures.tap(ANDROID_I_UNDERSTAND_BUTTON_ID)
      : await Gestures.tap(IOS_I_UNDERSTAND_BUTTON_ID);
  }

  async tapCreatePasswordButton() {
    await Gestures.waitAndTap(CREATE_PASSWORD_BUTTON_ID);
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
