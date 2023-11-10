import TestHelpers from '../../../../helpers';
import {
  RESET_PASSWORD_INPUT_ID,
  RESET_PASSWORD_INPUT_BOX_ID,
  RESET_PASSWORD_CONFIRM_INPUT_BOX_ID,
  RESET_PASSWORD_CONFIRM_BUTTON_ID,
  RESET_PASSWORD_ANDROID_TERM_CHECKBOX_ID,
} from '../../../../../wdio/screen-objects/testIDs/Screens/ChangePasswordScreensIDs.testIds';

import { ChoosePasswordSelectorsIDs } from '../../../../selectors/Onboarding/ChoosePassword.selectors';
import { ChangePasswordViewSelectorsText } from '../../../../selectors/Settings/SecurityAndPrivacy/ChangePasswordView.selectors';

export default class ChangePasswordView {
  static async typeInConfirmPasswordInputBox(PASSWORD) {
    await TestHelpers.typeTextAndHideKeyboard(
      RESET_PASSWORD_INPUT_ID,
      PASSWORD,
    );
  }

  static async tapConfirmButton() {
    await TestHelpers.tapByText(ChangePasswordViewSelectorsText.CONFIRM_BUTTON);
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
      await TestHelpers.tap(
        ChoosePasswordSelectorsIDs.IOS_I_UNDERSTAND_BUTTON_ID,
      );
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
    await TestHelpers.checkIfElementWithTextIsVisible(
      ChangePasswordViewSelectorsText.CHANGE_PASSWORD,
    );
  }

  static async isNotVisible() {
    await TestHelpers.checkIfElementWithTextIsNotVisible(
      ChangePasswordViewSelectorsText.CHANGE_PASSWORD,
    );
  }
}
