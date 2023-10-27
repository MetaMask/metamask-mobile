import TestHelpers from '../../helpers';

import { ChoosePasswordSelectorsIDs } from '../../selectors/Onboarding/ChoosePassword.selectors';

export default class CreatePasswordView {
  static async enterPassword(password) {
    await TestHelpers.typeTextAndHideKeyboard(
      ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      password,
    );
  }

  static async reEnterPassword(password) {
    await TestHelpers.typeTextAndHideKeyboard(
      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      password,
    );
  }

  static async tapIUnderstandCheckBox() {
    if (device.getPlatform() === 'ios') {
      await TestHelpers.tap(
        ChoosePasswordSelectorsIDs.IOS_I_UNDERSTAND_BUTTON_ID,
      );
    } else {
      // Tap by the I understand text
      await TestHelpers.delay(2000);
      await TestHelpers.tap(
        ChoosePasswordSelectorsIDs.ANDROID_I_UNDERSTAND_BUTTON_ID,
      );
    }
  }

  static async tapCreatePasswordButton() {
    if (device.getPlatform() === 'ios') {
      await TestHelpers.waitAndTap(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID);
    } else {
      await TestHelpers.waitAndTapByLabel(
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );
    }
  }

  // Assertions
  static async isVisible() {
    await TestHelpers.checkIfVisible(ChoosePasswordSelectorsIDs.CONTAINER_ID);
  }
}
