import TestHelpers from '../../helpers';

import {
  CREATE_PASSWORD_CONTAINER_ID,
  CREATE_PASSWORD_INPUT_BOX_ID,
  CONFIRM_PASSWORD_INPUT_BOX_ID,
  IOS_I_UNDERSTAND_BUTTON_ID,
  ANDROID_I_UNDERSTAND_BUTTON_ID,
} from '../../../app/constants/test-ids';

const CREATE_PASSWORD_BUTTON_ID = 'submit-button';
const REMEMBER_ME_ID = 'remember-me-toggle';

export default class CreatePasswordView {
  static async toggleRememberMe() {
    await TestHelpers.tap(REMEMBER_ME_ID);
  }

  static async enterPassword(password) {
    await TestHelpers.typeTextAndHideKeyboard(
      CREATE_PASSWORD_INPUT_BOX_ID,
      password,
    );
  }

  static async reEnterPassword(password) {
    await TestHelpers.typeTextAndHideKeyboard(
      CONFIRM_PASSWORD_INPUT_BOX_ID,
      password,
    );
  }

  static async tapIUnderstandCheckBox() {
    if (device.getPlatform() === 'ios') {
      await TestHelpers.tap(IOS_I_UNDERSTAND_BUTTON_ID);
    } else {
      // Tap by the I understand text
      await TestHelpers.delay(1000);
      await TestHelpers.tap(ANDROID_I_UNDERSTAND_BUTTON_ID);
    }
  }

  static async tapCreatePasswordButton() {
    await TestHelpers.tap(CREATE_PASSWORD_BUTTON_ID);
  }

  // Assertions
  static async isVisible() {
    await TestHelpers.checkIfVisible(CREATE_PASSWORD_CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(CREATE_PASSWORD_CONTAINER_ID);
  }
}
