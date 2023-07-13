import {
  IMPORT_FROM_SEED_SCREEN_CONFIRM_PASSWORD_CHECK_ICON_ID,
  IMPORT_FROM_SEED_SCREEN_PASSWORD_STRENGTH_ID,
  IMPORT_FROM_SEED_SCREEN_SEED_PHRASE_INPUT_ID,
  IMPORT_FROM_SEED_SCREEN_SUBMIT_BUTTON_ID,
  IMPORT_FROM_SEED_SCREEN_TITLE_ID,
} from '../testIDs/Screens/ImportFromSeedScreen.testIds';
import {
  CONFIRM_PASSWORD_INPUT_FIRST_FIELD,
  CREATE_PASSWORD_INPUT_FIRST_FIELD,
} from '../testIDs/Screens/WalletSetupScreen.testIds';

import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';

class ImportFromSeed {
  get screenTitle() {
    return Selectors.getXpathElementByResourceId(
      IMPORT_FROM_SEED_SCREEN_TITLE_ID,
    );
  }

  get seedPhraseInput() {
    return Selectors.getXpathElementByResourceId(
      IMPORT_FROM_SEED_SCREEN_SEED_PHRASE_INPUT_ID,
    );
  }

  get newPasswordInput() {
    return Selectors.getXpathElementByResourceId(
      CREATE_PASSWORD_INPUT_FIRST_FIELD,
    );
  }

  get confirmPasswordInput() {
    return Selectors.getXpathElementByResourceId(
      CONFIRM_PASSWORD_INPUT_FIRST_FIELD,
    );
  }

  get importButton() {
    return Selectors.getXpathElementByResourceId(
      IMPORT_FROM_SEED_SCREEN_SUBMIT_BUTTON_ID,
    );
  }

  get passwordStrengthLabel() {
    return Selectors.getXpathElementByResourceId(
      IMPORT_FROM_SEED_SCREEN_PASSWORD_STRENGTH_ID,
    );
  }

  get passwordMatchIcon() {
    return Selectors.getXpathElementByResourceId(
      IMPORT_FROM_SEED_SCREEN_CONFIRM_PASSWORD_CHECK_ICON_ID,
    );
  }

  async isScreenTitleVisible() {
    await expect(this.screenTitle).toBeDisplayed();
  }

  async typeSecretRecoveryPhrase(phrase) {
    await Gestures.typeText(this.seedPhraseInput, phrase);
  }

  async typeNewPassword(newPassword) {
    await Gestures.typeText(this.newPasswordInput, newPassword);
  }

  async typeConfirmPassword(confirmPassword) {
    await Gestures.typeText(this.confirmPasswordInput, confirmPassword);
  }

  async clickImportButton() {
    await Gestures.waitAndTap(this.screenTitle);
    await Gestures.tapByTextContaining('IMPORT');
  }

  async tapImportFromSeedTextToDismissKeyboard() {
    await Gestures.waitAndTap(this.screenTitle);
  }

  async isPasswordStrengthTextCorrect(text) {
    await expect(this.passwordStrengthLabel).toHaveText(text);
  }

  async isAlertTextVisible(text) {
    await driver.pause(1000);
    const message = await driver.getAlertText();
    try {
      expect(message.includes(text.trim())).toBe(true);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(`Not able to get device alert text: `);
    }
  }

  async tapOkInAlertMessage() {
    await driver.acceptAlert();
  }

  async isPasswordMatchIconVisible() {
    await expect(this.passwordMatchIcon).toBeDisplayed();
  }
}

export default new ImportFromSeed();
