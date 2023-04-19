import TestHelpers from '../../helpers';
import messages from '../../../locales/languages/en.json';

import {
  CREATE_PASSWORD_INPUT_BOX_ID,
  CONFIRM_PASSWORD_INPUT_BOX_ID,
  IOS_I_UNDERSTAND_BUTTON_ID,
  ANDROID_I_UNDERSTAND_BUTTON_ID,
  IMPORT_PASSWORD_CONTAINER_ID,
} from '../../../app/constants/test-ids';
import { IMPORT_FROM_SEED_SCREEN_SEED_PHRASE_INPUT_ID } from '../../../wdio/screen-objects/testIDs/Screens/ImportFromSeedScreen.testIds';

const REMEMBER_ME_ID = 'remember-me-toggle';
const CREATE_PASSWORD_BUTTON_ID = 'submit-button';

const Incorrect_Password_Length =
  messages.import_from_seed.password_length_error;
const Invalid_Seed_Error = messages.import_from_seed.invalid_seed_phrase;

export default class ImportWalletView {
  static async enterPassword(password) {
    await TestHelpers.typeTextAndHideKeyboard(
      CREATE_PASSWORD_INPUT_BOX_ID,
      password,
    );
  }

  static async reEnterPassword(password) {
    await TestHelpers.typeTextAndHideKeyboard(
      CONFIRM_PASSWORD_INPUT_BOX_ID,
      password,
    );
  }

  static async tapIUnderstandCheckBox() {
    if (device.getPlatform() === 'ios') {
      await TestHelpers.tap(IOS_I_UNDERSTAND_BUTTON_ID);
    } else {
      // Tap by the I understand text
      await TestHelpers.delay(1000);
      await TestHelpers.tap(ANDROID_I_UNDERSTAND_BUTTON_ID);
    }
  }

  static async tapCreatePasswordButton() {
    await TestHelpers.tap(CREATE_PASSWORD_BUTTON_ID);
  }

  static async tapOKAlertButton() {
    await TestHelpers.tapAlertWithButton('OK');
  }

  static async enterSecretRecoveryPhrase(secretRecoveryPhrase) {
    if (device.getPlatform() === 'android') {
      await TestHelpers.replaceTextInField(
        IMPORT_FROM_SEED_SCREEN_SEED_PHRASE_INPUT_ID,
        secretRecoveryPhrase,
      );
      await element(
        by.id(IMPORT_FROM_SEED_SCREEN_SEED_PHRASE_INPUT_ID),
      ).tapReturnKey();
    } else {
      await TestHelpers.typeTextAndHideKeyboard(
        IMPORT_FROM_SEED_SCREEN_SEED_PHRASE_INPUT_ID,
        secretRecoveryPhrase,
      );
    }
  }
  static async clearSecretRecoveryPhraseInputBox() {
    await TestHelpers.clearField(IMPORT_FROM_SEED_SCREEN_SEED_PHRASE_INPUT_ID);
  }

  static async toggleRememberMe() {
    await TestHelpers.tap(REMEMBER_ME_ID);
  }

  // Assertions
  static async isVisible() {
    await TestHelpers.checkIfVisible(IMPORT_PASSWORD_CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(IMPORT_PASSWORD_CONTAINER_ID);
  }

  static async secretRecoveryPhraseErrorIsVisible() {
    await TestHelpers.checkIfElementByTextIsVisible(Invalid_Seed_Error);
  }
  static async passwordLengthErrorIsVisible() {
    await TestHelpers.checkIfElementByTextIsVisible(Incorrect_Password_Length);
  }
}
