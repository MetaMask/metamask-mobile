import TestHelpers from '../../../helpers';
import {
  RESET_PASSWORD_CONFIRM_INPUT_BOX_ID,
  RESET_PASSWORD_ANDROID_TERM_CHECKBOX_ID,
} from '../../../../wdio/screen-objects/testIDs/Screens/ChangePasswordScreensIDs.testIds';
import { ChoosePasswordSelectorsIDs } from '../../../selectors/Onboarding/ChoosePassword.selectors';
import { ChangePasswordViewSelectorsText } from '../../../selectors/Settings/SecurityAndPrivacy/ChangePasswordView.selectors';

import Matchers from '../../../utils/Matchers';
import Gestures from '../../../utils/Gestures';

class ChangePasswordView {
  get title() {
    return Matchers.getElementByText(
      ChangePasswordViewSelectorsText.CHANGE_PASSWORD,
    );
  }

  get passwordInput() {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
    );
  }

  get confirmPasswordInput() {
    return Matchers.getElementByID(RESET_PASSWORD_CONFIRM_INPUT_BOX_ID);
  }

  get androidUnderstandCheck() {
    return Matchers.getElementByID(RESET_PASSWORD_ANDROID_TERM_CHECKBOX_ID);
  }

  get iosUnderstandCheck() {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
    );
  }

  get submitButton() {
    return Matchers.getElementByText(
      ChoosePasswordSelectorsIDs.RESET_PASSWORD_BUTTON_TEXT,
    );
  }

  async typeInConfirmPasswordInputBox(PASSWORD) {
    await Gestures.typeTextAndHideKeyboard(this.passwordInput, PASSWORD);
  }

  async reEnterPassword(PASSWORD) {
    await Gestures.typeTextAndHideKeyboard(this.confirmPasswordInput, PASSWORD);
  }

  async tapIUnderstandCheckBox() {
    if (device.getPlatform() === 'ios') {
      await Gestures.waitAndTap(this.iosUnderstandCheck);
    } else {
      // Tap by the I understand text
      await Gestures.waitAndTap(this.androidUnderstandCheck);
    }
  }

  async tapSubmitButton() {
    await Gestures.waitAndTap(this.submitButton, { delayBeforeTap: 1000 });
  }
}

export default new ChangePasswordView();
