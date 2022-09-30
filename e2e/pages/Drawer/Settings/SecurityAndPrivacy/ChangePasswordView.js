import TestHelpers from '../../../../helpers';
import {
  CONFIRM_CHANGE_PASSWORD_INPUT_BOX_ID,
  CONFIRM_PASSWORD_INPUT_BOX_ID,
  CREATE_PASSWORD_INPUT_BOX_ID,
  SUBMIT_BUTTON_ID,
  IOS_I_UNDERSTAND_BUTTON_ID,
  ANDROID_I_UNDERSTAND_BUTTON_ID,
} from '../../../../../app/constants/test-ids';

import { strings } from '../../../../../locales/i18n';

const CHANGE_PASSWORD_TEXT = strings('manual_backup_step_1.confirm_password');

export default class ChangePasswordView {
  static async typeInConfirmPasswordInputBox(PASSWORD) {
    await TestHelpers.typeTextAndHideKeyboard(
      CONFIRM_CHANGE_PASSWORD_INPUT_BOX_ID,
      PASSWORD,
    );
  }

  static async tapConfirmButton() {
    await TestHelpers.tapByText('CONFIRM');
  }

  static async enterPassword(PASSWORD) {
    await TestHelpers.typeTextAndHideKeyboard(
      CREATE_PASSWORD_INPUT_BOX_ID,
      PASSWORD,
    );
  }

  static async reEnterPassword(PASSWORD) {
    await TestHelpers.typeTextAndHideKeyboard(
      CONFIRM_PASSWORD_INPUT_BOX_ID,
      PASSWORD,
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

  static async tapResetPasswordButton() {
    await TestHelpers.waitAndTap(SUBMIT_BUTTON_ID);
  }

  static async isVisible() {
    await TestHelpers.checkIfElementWithTextIsVisible(CHANGE_PASSWORD_TEXT);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfElementWithTextIsNotVisible(CHANGE_PASSWORD_TEXT);
  }
}
