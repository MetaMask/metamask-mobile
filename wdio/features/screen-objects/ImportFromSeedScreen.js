import {
  IMPORT_FROM_SEED_SCREEN_TITLE_ID,
  IMPORT_FROM_SEED_SCREEN_SEED_PHRASE_INPUT_ID,
  IMPORT_FROM_SEED_SCREEN_NEW_PASSWORD_INPUT_ID,
  IMPORT_FROM_SEED_SCREEN_CONFIRM_PASSWORD_INPUT_ID,
  IMPORT_FROM_SEED_SCREEN_SUBMIT_BUTTON_ID,
} from '../../../app/constants/testIDs/Screens/ImportFromSeedScreen.testIds';
import Selectors from '../helpers/Selectors';

class ImportFromSeed {
  async verifyScreenTitle() {
    await expect(await $(`~${IMPORT_FROM_SEED_SCREEN_TITLE_ID}`)).toBeDisplayed();
  }

  async typeSecretRecoveryPhrase(phrase) {
    const elem = await $(`~${IMPORT_FROM_SEED_SCREEN_SEED_PHRASE_INPUT_ID}`)
    await elem.setValue(phrase);
  }

  async typeNewPassword(newPassword) {
    const elem = await Selectors.getElementByPlatform(IMPORT_FROM_SEED_SCREEN_NEW_PASSWORD_INPUT_ID)
    await elem.setValue(newPassword);
  }

  async typeConfirmPassword(confirmPassword) {
    const elem = await Selectors.getElementByPlatform(IMPORT_FROM_SEED_SCREEN_CONFIRM_PASSWORD_INPUT_ID)
    await elem.setValue(confirmPassword);
  }

  async clickImportButton() {
    await $(`~${IMPORT_FROM_SEED_SCREEN_TITLE_ID}`).click();
    await $(`~${IMPORT_FROM_SEED_SCREEN_SUBMIT_BUTTON_ID}`).click();
  }
}

export default new ImportFromSeed();
