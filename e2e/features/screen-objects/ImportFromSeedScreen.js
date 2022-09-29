import {
  IMPORT_FROM_SEED_SCREEN_TITLE_ID,
  IMPORT_FROM_SEED_SCREEN_SEED_PHRASE_INPUT_ID,
  IMPORT_FROM_SEED_SCREEN_NEW_PASSWORD_INPUT_ID,
  IMPORT_FROM_SEED_SCREEN_CONFIRM_PASSWORD_INPUT_ID,
} from '../../../app/constants/testIDs/Screens/ImportFromSeedScreen.testIds';
import Selectors from '../helpers/Selectors';

class ImportFromSeed {
  async verifyScreenTitle() {
    await expect(await $(`~${IMPORT_FROM_SEED_SCREEN_TITLE_ID}`)).toBeDisplayed();
  }

  async typeSecretRecoveryPhrase() {
    const elem = await $(`~${IMPORT_FROM_SEED_SCREEN_SEED_PHRASE_INPUT_ID}`)
    await expect(elem).toBeDisplayed();
    await elem.setValue(
      IMPORT_FROM_SEED_SCREEN_SEED_PHRASE_INPUT_ID,
    );
    await driver.hideKeyboard('pressKey', 'next');
  }

  async typeNewPassword() {
    const elem = await Selectors.getElementByPlatform(IMPORT_FROM_SEED_SCREEN_NEW_PASSWORD_INPUT_ID)
    await expect(elem).toBeDisplayed();
    await elem.setValue(
      IMPORT_FROM_SEED_SCREEN_NEW_PASSWORD_INPUT_ID,
    );
  }

  async typeConfirmPassword() {
    const elem = await $(`~${IMPORT_FROM_SEED_SCREEN_CONFIRM_PASSWORD_INPUT_ID}`)
    await expect(elem).toBeDisplayed();
    await elem.setValue(
      IMPORT_FROM_SEED_SCREEN_CONFIRM_PASSWORD_INPUT_ID,
    );
  }
}

export default new ImportFromSeed();
