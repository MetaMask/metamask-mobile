import TestHelpers from '../../../../helpers';

import {
  RevealSeedViewSelectorsIDs,
  RevealSeedViewSelectorsText,
} from '../../../../selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors';

export default class RevealSecretRecoveryPhrase {
  static async enterPassword(password) {
    await TestHelpers.typeTextAndHideKeyboard(
      RevealSeedViewSelectorsIDs.PASSWORD_INPUT,
      password,
    );
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_CONTAINER_ID,
    );
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_CONTAINER_ID,
    );
  }

  static async passwordWarningIsVisible() {
    await TestHelpers.checkIfHasText(
      RevealSeedViewSelectorsIDs.PASSWORD_WARNING,
      RevealSeedViewSelectorsText.PASSWORD_WARNING,
    );
  }

  static async passwordInputIsNotVisible() {
    await TestHelpers.checkIfNotVisible(
      RevealSeedViewSelectorsIDs.PASSWORD_INPUT,
    );
  }

  static async isSecretRecoveryPhraseTouchableBoxVisible() {
    await TestHelpers.checkIfVisible(
      RevealSeedViewSelectorsIDs.REVEAL_SECRET_RECOVERY_PHRASE_TOUCHABLE_BOX_ID,
    );
  }

  static async isSecretRecoveryPhraseTextCorrect(Correct_Seed_Words) {
    await TestHelpers.checkIfHasText(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_TEXT,
      Correct_Seed_Words,
    );
  }
}
