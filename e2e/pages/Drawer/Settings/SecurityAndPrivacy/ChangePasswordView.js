import TestHelpers from '../../../../helpers';
import { IOS_I_UNDERSTAND_BUTTON_ID } from '../../../../../app/constants/test-ids';
import {
  RESET_PASSWORD_INPUT_ID,
  RESET_PASSWORD_INPUT_BOX_ID,
  RESET_PASSWORD_CONFIRM_INPUT_BOX_ID,
  RESET_PASSWORD_CONFIRM_BUTTON_ID,
  RESET_PASSWORD_ANDROID_TERM_CHECKBOX_ID,
} from '../../../../../wdio/screen-objects/testIDs/Screens/ChangePasswordScreensIDs.testIds';

import messages from '../../../../../locales/languages/en.json';

const CHANGE_PASSWORD_TEXT = messages.manual_backup_step_1.confirm_password;
const CONFIRM_BUTTON_TEXT = messages.account_backup_step_4.confirm;

export default class ChangePasswordView {
  static async typeInConfirmPasswordInputBox(PASSWORD) {
    await TestHelpers.typeTextAndHideKeyboard(
      RESET_PASSWORD_INPUT_ID,
      PASSWORD,
    );
  }

  static async tapConfirmButton() {
    await TestHelpers.tapByText(CONFIRM_BUTTON_TEXT);
  }

  static async enterPassword(PASSWORD) {
    await TestHelpers.typeTextAndHideKeyboard(
      RESET_PASSWORD_INPUT_BOX_ID,
      PASSWORD,
    );
  }

  static async reEnterPassword(PASSWORD) {
    await TestHelpers.typeTextAndHideKeyboard(
      RESET_PASSWORD_CONFIRM_INPUT_BOX_ID,
      PASSWORD,
    );
  }

  static async tapIUnderstandCheckBox() {
    if (device.getPlatform() === 'ios') {
      await TestHelpers.tap(IOS_I_UNDERSTAND_BUTTON_ID);
    } else {
      // Tap by the I understand text
      await TestHelpers.delay(1000);
      await TestHelpers.tap(RESET_PASSWORD_ANDROID_TERM_CHECKBOX_ID);
    }
  }

  static async tapResetPasswordButton() {
    await TestHelpers.waitAndTap(RESET_PASSWORD_CONFIRM_BUTTON_ID);
  }

  static async isVisible() {
    await TestHelpers.checkIfElementWithTextIsVisible(CHANGE_PASSWORD_TEXT);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfElementWithTextIsNotVisible(CHANGE_PASSWORD_TEXT);
  }
}
