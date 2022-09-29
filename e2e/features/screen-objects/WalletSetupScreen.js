import { TERMS_AND_CONDITIONS_BUTTON_ID } from '../../../app/constants/testIDs/Components/TermsAndConditions.testIds';
import {
  WALLET_SETUP_CREATE_NEW_WALLET_BUTTON_ID,
  WALLET_SETUP_SCREEN_DESCRIPTION_ID,
  WALLET_SETUP_SCREEN_IMPORT_FROM_SEED_BUTTON_ID,
  WALLET_SETUP_SCREEN_TITLE_ID
} from '../../../app/constants/testIDs/Screens/WalletSetupScreen.testIds';

class WalletSetupScreen {
  async verifyScreenTitle() {
    await expect(await $(`~${WALLET_SETUP_SCREEN_TITLE_ID}`)).toBeDisplayed();
  }

  async verifyScreenDescription() {
    await expect(await $(`~${WALLET_SETUP_SCREEN_DESCRIPTION_ID}`)).toBeDisplayed();
  }

  async verifyImportWalletButton() {
    await expect(await $(`~${WALLET_SETUP_SCREEN_IMPORT_FROM_SEED_BUTTON_ID}`)).toBeDisplayed();
  }

  async verifyCreateNewWalletButton() {
    await expect(await $(`~${WALLET_SETUP_CREATE_NEW_WALLET_BUTTON_ID}`)).toBeDisplayed();
  }

  async verifyTermsAndConditionsButton() {
    await expect(await $(`~${TERMS_AND_CONDITIONS_BUTTON_ID}`)).toBeDisplayed();
  }

  async clickImportWalletButton() {
    await $(`~${WALLET_SETUP_SCREEN_IMPORT_FROM_SEED_BUTTON_ID}`).click();
  }
}

export default new WalletSetupScreen();
