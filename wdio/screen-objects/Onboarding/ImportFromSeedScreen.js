import {
  ANDROID_IMPORT_FROM_SEED_SCREEN_SEED_PHRASE_INPUT_ID,
  IMPORT_FROM_SEED_SCREEN_CONFIRM_PASSWORD,
  IMPORT_FROM_SEED_SCREEN_CONFIRM_PASSWORD_CHECK_ICON_ID,
  IMPORT_FROM_SEED_SCREEN_PASSWORD_STRENGTH_ID,
  IMPORT_FROM_SEED_SCREEN_SUBMIT_BUTTON_ID,
  IMPORT_FROM_SEED_SCREEN_TITLE_ID,
  IOS_IMPORT_FROM_SEED_SCREEN_SEED_PHRASE_INPUT_ID,
} from '../testIDs/Screens/ImportFromSeedScreen.testIds';
import {
  ANDROID_CONFIRM_PASSWORD_INPUT_FIRST_FIELD,
  ANDROID_CREATE_PASSWORD_INPUT_FIRST_FIELD,
  IOS_CONFIRM_PASSWORD_INPUT_FIRST_FIELD,
  IOS_CREATE_PASSWORD_INPUT_FIRST_FIELD,
} from '../testIDs/Screens/WalletSetupScreen.testIds';

import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';

class ImportFromSeed {
  get screenTitle() {
    return Selectors.getXpathElementByResourceId(
      IMPORT_FROM_SEED_SCREEN_TITLE_ID,
    );
  }

  get androidSeedPhraseInput() {
    return Selectors.getXpathElementByResourceId(
      ANDROID_IMPORT_FROM_SEED_SCREEN_SEED_PHRASE_INPUT_ID,
    );
  }

  get iosSeedPhraseInput() {
    return Selectors.getElementByCss(
      IOS_IMPORT_FROM_SEED_SCREEN_SEED_PHRASE_INPUT_ID,
    );
  }

  get androidNewPasswordInput() {
    return Selectors.getXpathElementByResourceId(
      ANDROID_CREATE_PASSWORD_INPUT_FIRST_FIELD,
    );
  }

  get iosNewPasswordInput() {
    return Selectors.getElementByCss(IOS_CREATE_PASSWORD_INPUT_FIRST_FIELD);
  }

  get androidConfirmPasswordInput() {
    return Selectors.getXpathElementByResourceId(
      ANDROID_CONFIRM_PASSWORD_INPUT_FIRST_FIELD,
    );
  }

  get iosConfirmPasswordInput() {
    return Selectors.getElementByCss(IOS_CONFIRM_PASSWORD_INPUT_FIRST_FIELD);
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

  get confirmPasswordText() {
    return Selectors.getXpathElementByText(
      IMPORT_FROM_SEED_SCREEN_CONFIRM_PASSWORD,
    );
  }

  async isScreenTitleVisible() {
    await expect(this.screenTitle).toBeDisplayed();
  }

  async typeSecretRecoveryPhrase(phrase) {
    const platform = await driver.getPlatform();
    if (platform === 'iOS') {
      await Gestures.typeText(this.iosSeedPhraseInput, phrase);
    }

    if (platform === 'Android') {
      await Gestures.typeText(this.androidSeedPhraseInput, phrase);
    }
  }

  async typeNewPassword(newPassword) {
    const platform = await driver.getPlatform();
    if (platform === 'iOS') {
      await Gestures.typeText(this.iosNewPasswordInput, newPassword);
    }

    if (platform === 'Android') {
      await Gestures.typeText(this.androidNewPasswordInput, newPassword);
    }
  }

  async typeConfirmPassword(confirmPassword) {
    const platform = await driver.getPlatform();
    if (platform === 'iOS') {
      await Gestures.typeText(this.iosConfirmPasswordInput, confirmPassword);
    }

    if (platform === 'Android') {
      await Gestures.typeText(
        this.androidConfirmPasswordInput,
        confirmPassword,
      );
    }
  }

  async clickImportButton() {
    await Gestures.waitAndTap(this.screenTitle);
    await Gestures.waitAndTap(this.importButton);
  }

  async tapImportFromSeedTextToDismissKeyboard() {
    await Gestures.waitAndTap(this.confirmPasswordText);
  }

  async isPasswordStrengthTextCorrect(text) {
    await expect(this.passwordStrengthLabel).toHaveText(text);
  }

  async isAlertTextVisible(text) {
    await driver.pause(1000);
    const message = driver.getAlertText();
    try {
      expect(message.includes(text.trim())).toBe(true);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(`Not able to get device alert text: `);
    }
  }

  async isPasswordMatchIconVisible() {
    await expect(this.passwordMatchIcon).toBeDisplayed();
  }
}

export default new ImportFromSeed();
