import TestHelpers from '../../../../helpers';
import messages from '../../../../../locales/languages/en.json';
import { 
  PRIVATE_KEY_PASSWORD_INPUT_BOX_ID,
 } from '../../../../../app/constants/test-ids';
import {
  PASSWORD_WARNING_ID,
  PRIVATE_KEY_TOUCHABLE_BOX_ID,
  PRIVATE_KEY_CONTAINER_ID,
  PRIVATE_KEY_TEXT,
  SECRET_RECOVERY_PHRASE_LONG_PRESS_BUTTON_ID
  } from '../../../../../wdio/screen-objects/testIDs/Screens/ShowPrivateKey.testIds';

const PASSWORD_WARNING = messages.reveal_credential.warning_incorrect_password;

export default class ShowPrivateKey {
  static async enterPassword(password) {
    await TestHelpers.typeTextAndHideKeyboard(PRIVATE_KEY_PASSWORD_INPUT_BOX_ID, password);
  }

  static async enterIncorrectPassword(incorrectPassword) {
    await TestHelpers.typeTextAndHideKeyboard(PRIVATE_KEY_PASSWORD_INPUT_BOX_ID, incorrectPassword);
  }

  static async longPressAndHoldToRevealPrivateKey (SECRET_RECOVERY_PHRASE_LONG_PRESS_BUTTON_ID) {
    await TestHelpers.tapAndLongPress(SECRET_RECOVERY_PHRASE_LONG_PRESS_BUTTON_ID);
    return element(by.id('SECRET_RECOVERY_PHRASE_LONG_PRESS_BUTTON_ID')).longPress(2000);
  }


  static async isVisible() {
    await TestHelpers.checkIfVisible(PRIVATE_KEY_CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(PRIVATE_KEY_CONTAINER_ID);
  }

  static async passwordWarningIsVisible() {
    await TestHelpers.checkIfHasText(PASSWORD_WARNING_ID, PASSWORD_WARNING);
  }

  static async passwordInputIsNotVisible() {
    await TestHelpers.checkIfNotVisible(PRIVATE_KEY_PASSWORD_INPUT_BOX_ID);
  }

  static async isPrivateKeyTouchableBoxVisible() {
    await TestHelpers.checkIfVisible(
      PRIVATE_KEY_TOUCHABLE_BOX_ID,
    );
  }

  static async isPrivateKeyTextCorrect(Correct_Private_Key_Text) {
    await TestHelpers.checkIfHasText(
      PRIVATE_KEY_TEXT,
      Correct_Private_Key_Text,
    );
  }
}
