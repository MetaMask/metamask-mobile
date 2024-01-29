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
      ChoosePasswordSelectorsIDs.IOS_I_UNDERSTAND_BUTTON_ID,
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
      await TestHelpers.delay(1000);
      await Gestures.waitAndTap(this.androidUnderstandCheck);
    }
  }
}

export default new ChangePasswordView();
