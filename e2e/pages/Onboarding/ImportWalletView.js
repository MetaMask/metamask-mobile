import TestHelpers from '../../helpers';

import { ChoosePasswordSelectorsIDs } from '../../selectors/Onboarding/ChoosePassword.selectors';
import { ImportFromSeedSelectorsIDs } from '../../selectors/Onboarding/ImportFromSeed.selectors';

export default class ImportWalletView {
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

  static async enterSecretRecoveryPhrase(secretRecoveryPhrase) {
    if (device.getPlatform() === 'android') {
      await TestHelpers.replaceTextInField(
        ImportFromSeedSelectorsIDs.IMPORT_FROM_SEED_SCREEN_SEED_PHRASE_INPUT_ID,
        secretRecoveryPhrase,
      );
      await element(
        by.id(
          ImportFromSeedSelectorsIDs.IMPORT_FROM_SEED_SCREEN_SEED_PHRASE_INPUT_ID,
        ),
      ).tapReturnKey();
    } else {
      await TestHelpers.typeTextAndHideKeyboard(
        ImportFromSeedSelectorsIDs.IMPORT_FROM_SEED_SCREEN_SEED_PHRASE_INPUT_ID,
        secretRecoveryPhrase,
      );
    }
  }
  static async clearSecretRecoveryPhraseInputBox() {
    await TestHelpers.clearField(
      ImportFromSeedSelectorsIDs.IMPORT_FROM_SEED_SCREEN_SEED_PHRASE_INPUT_ID,
    );
  }

  // Assertions
  static async isVisible() {
    await TestHelpers.checkIfVisible(ImportFromSeedSelectorsIDs.CONTAINER_ID);
  }
}
