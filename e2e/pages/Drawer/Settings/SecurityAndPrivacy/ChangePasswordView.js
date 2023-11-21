import TestHelpers from '../../../../helpers';
import {
  RESET_PASSWORD_INPUT_ID,
  RESET_PASSWORD_CONFIRM_INPUT_BOX_ID,
  RESET_PASSWORD_ANDROID_TERM_CHECKBOX_ID,
} from '../../../../../wdio/screen-objects/testIDs/Screens/ChangePasswordScreensIDs.testIds';
import { ChoosePasswordSelectorsIDs } from '../../../../selectors/Onboarding/ChoosePassword.selectors';
import { ChangePasswordViewSelectorsText } from '../../../../selectors/Settings/SecurityAndPrivacy/ChangePasswordView.selectors';

import Matchers from '../../../../utils/Matchers';
import Gestures from '../../../../utils/Gestures';

export default class ChangePasswordView {
  static get title() {
    return Matchers.getElementByText(
      ChangePasswordViewSelectorsText.CHANGE_PASSWORD,
    );
  }

  static get passwordInput() {
    return Matchers.getElementByID(RESET_PASSWORD_INPUT_ID);
  }

  static get confirmPasswordInput() {
    return Matchers.getElementByID(RESET_PASSWORD_CONFIRM_INPUT_BOX_ID);
  }

  static get androidUnderstandCheck() {
    return Matchers.getElementByID(RESET_PASSWORD_ANDROID_TERM_CHECKBOX_ID);
  }

  static get iosUnderstandCheck() {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.IOS_I_UNDERSTAND_BUTTON_ID,
    );
  }

  static async typeInConfirmPasswordInputBox(PASSWORD) {
    await Gestures.typeTextAndHideKeyboard(this.passwordInput, PASSWORD);
  }

  static async reEnterPassword(PASSWORD) {
    await Gestures.typeTextAndHideKeyboard(this.confirmPasswordInput, PASSWORD);
  }

  static async tapIUnderstandCheckBox() {
    if (device.getPlatform() === 'ios') {
      await Gestures.tap(await this.iosUnderstandCheck);
    } else {
      // Tap by the I understand text
      await TestHelpers.delay(1000);
      await Gestures.tap(await this.androidUnderstandCheck);
    }
  }

  static async getTitle() {
    return await this.title;
  }
}
