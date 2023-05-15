import TestHelpers from '../../../../helpers';
import messages from '../../../../../locales/languages/en.json';
import { PASSWORD_INPUT_BOX_ID } from '../../../../../app/constants/test-ids';
import {
  PASSWORD_WARNING_ID,
  REVEAL_SECRET_RECOVERY_PHRASE_TOUCHABLE_BOX_ID,
  SECRET_RECOVERY_PHRASE_CONTAINER_ID,
  SECRET_RECOVERY_PHRASE_TEXT,
} from '../../../../../wdio/screen-objects/testIDs/Screens/RevelSecretRecoveryPhrase.testIds';

const PASSWORD_WARNING = messages.reveal_credential.unknown_error;

export default class RevealSecretRecoveryPhrase {
  static async enterPassword(password) {
    await TestHelpers.typeTextAndHideKeyboard(PASSWORD_INPUT_BOX_ID, password);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(SECRET_RECOVERY_PHRASE_CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(SECRET_RECOVERY_PHRASE_CONTAINER_ID);
  }

  static async passwordWarningIsVisible() {
    await TestHelpers.checkIfHasText(PASSWORD_WARNING_ID, PASSWORD_WARNING);
  }

  static async passwordInputIsNotVisible() {
    await TestHelpers.checkIfNotVisible(PASSWORD_INPUT_BOX_ID);
  }

  static async isSecretRecoveryPhraseTouchableBoxVisible() {
    await TestHelpers.checkIfVisible(
      REVEAL_SECRET_RECOVERY_PHRASE_TOUCHABLE_BOX_ID,
    );
  }

  static async isSecretRecoveryPhraseTextCorrect(Correct_Seed_Words) {
    await TestHelpers.checkIfHasText(
      SECRET_RECOVERY_PHRASE_TEXT,
      Correct_Seed_Words,
    );
  }
}
