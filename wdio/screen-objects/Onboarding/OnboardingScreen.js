import { TERMS_AND_CONDITIONS_BUTTON_ID } from '../testIDs/Components/TermsAndConditions.testIds';
import {
  WALLET_SETUP_CREATE_NEW_WALLET_BUTTON_ID,
  WALLET_SETUP_SCREEN_DESCRIPTION_ID,
  WALLET_SETUP_SCREEN_IMPORT_FROM_SEED_BUTTON_ID,
  WALLET_SETUP_SCREEN_TITLE_ID,
} from '../testIDs/Screens/WalletSetupScreen.testIds';
import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';

class OnBoardingScreen {
  // selectors ====================================
  get title() {
    return Selectors.getElementByPlatform(WALLET_SETUP_SCREEN_TITLE_ID);
  }

  get description() {
    return Selectors.getElementByPlatform(WALLET_SETUP_SCREEN_DESCRIPTION_ID);
  }

  get seedButton() {
    return Selectors.getElementByPlatform(
      WALLET_SETUP_SCREEN_IMPORT_FROM_SEED_BUTTON_ID,
    );
  }

  get createNewWalletButton() {
    return Selectors.getElementByPlatform(
      WALLET_SETUP_CREATE_NEW_WALLET_BUTTON_ID,
    );
  }

  get termsAndConditionsButton() {
    return Selectors.getElementByPlatform(TERMS_AND_CONDITIONS_BUTTON_ID);
  }

  get importWalletButton() {
    return Selectors.getElementByPlatform(
      WALLET_SETUP_SCREEN_IMPORT_FROM_SEED_BUTTON_ID,
    );
  }
  get newWalletButton() {
    return Selectors.getElementByPlatform(
      WALLET_SETUP_CREATE_NEW_WALLET_BUTTON_ID,
    );
  }

  // functions and assertions ======================================

  async isScreenTitleVisible() {
    await expect(this.title).toBeDisplayed();
  }

  async isScreenDescriptionVisible() {
    await expect(this.description).toBeDisplayed();
  }

  async isImportWalletButtonVisible() {
    await expect(this.seedButton).toBeDisplayed();
  }

  async isCreateNewWalletButtonVisible() {
    await expect(this.createNewWalletButton).toBeDisplayed();
  }

  async isTermsAndConditionsButtonVisible() {
    await expect(this.termsAndConditionsButton).toBeDisplayed();
  }

  async clickImportWalletButton() {
    await Gestures.waitAndTap(this.importWalletButton);
  }

  async tapCreateNewWalletButton() {
    await Gestures.tap(this.newWalletButton);
  }
}

export default new OnBoardingScreen();
