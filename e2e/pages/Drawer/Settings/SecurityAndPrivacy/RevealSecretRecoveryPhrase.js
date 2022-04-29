import TestHelpers from '../../../../helpers';
import { strings } from '../../../../../locales/i18n';

const SECRET_RECOVERY_PHRASE_CONTAINER_ID = 'reveal-private-credential-screen';
const PASSWORD_INPUT_BOX_ID = 'private-credential-password-text-input';
const PASSWORD_WARNING_ID = 'password-warning';
const REVEAL_SECRET_RECOVERY_PHRASE_TOUCHABLE_BOX_ID =
  'private-credential-touchable';
const SECRET_RECOVERY_PHRASE_TEXT = 'private-credential-text';

// this way if the strings ever change the tests will not break :)
const PASSWORD_WARNING = strings('reveal_credential.unknown_error');

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
