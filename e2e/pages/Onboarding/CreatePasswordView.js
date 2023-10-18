import TestHelpers from '../../helpers';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';
import {
  CREATE_PASSWORD_CONTAINER_ID,
  CREATE_PASSWORD_INPUT_BOX_ID,
  CONFIRM_PASSWORD_INPUT_BOX_ID,
  IOS_I_UNDERSTAND_BUTTON_ID,
  ANDROID_I_UNDERSTAND_BUTTON_ID,
} from '../../../app/constants/test-ids';

const CREATE_PASSWORD_BUTTON_ID = 'submit-button';
const REMEMBER_ME_ID = 'remember-me-toggle';

class CreatePasswordView {
  get createPasswordInputBox() {
    return Matchers.getElementByID(CREATE_PASSWORD_INPUT_BOX_ID);
  }
  get welcomeButton() {
    return Matchers.getElementByID(WELCOME_SCREEN_GET_STARTED_BUTTON_ID);
  }

  get confirmPasswordInputBox() {
    return Matchers.getElementByID(CONFIRM_PASSWORD_INPUT_BOX_ID);
  }
  get createPasswordButton() {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(CREATE_PASSWORD_BUTTON_ID)
      : Matchers.getElementByLabel(CREATE_PASSWORD_BUTTON_ID);
  }

  async toggleRememberMe() {
    await TestHelpers.tap(REMEMBER_ME_ID);
  }

  async enterPassword(password) {
    await Gestures.typeTextAndHideKeyboard(
      this.createPasswordInputBox,
      password,
    );
  }

  async reEnterPassword(password) {
    await Gestures.typeTextAndHideKeyboard(
      this.confirmPasswordInputBox,
      password,
    );
  }

  async tapIUnderstandCheckBox() {
    if (device.getPlatform() === 'ios') {
      await TestHelpers.tap(IOS_I_UNDERSTAND_BUTTON_ID);
    } else {
      // Tap by the I understand text
      await TestHelpers.delay(2000);
      await TestHelpers.tap(ANDROID_I_UNDERSTAND_BUTTON_ID);
    }
  }

  async tapCreatePasswordButton() {
    if (device.getPlatform() === 'ios') {
      await Gestures.waitAndTap(this.createPasswordButton);
    } else {
      await Gestures.waitAndTapByLabel(this.createPasswordButton);
    }
  }

  // Assertions
  async isVisible() {
    await TestHelpers.checkIfVisible(CREATE_PASSWORD_CONTAINER_ID);
  }

  async isNotVisible() {
    await TestHelpers.checkIfNotVisible(CREATE_PASSWORD_CONTAINER_ID);
  }
}

export default new CreatePasswordView();
