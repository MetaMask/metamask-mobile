import { TERMS_AND_CONDITIONS_BUTTON_ID } from '../testIDs/Components/TermsAndConditions.testIds';
import {
  WALLET_SETUP_CREATE_NEW_WALLET_BUTTON_ID,
  WALLET_SETUP_SCREEN_DESCRIPTION_ID,
  WALLET_SETUP_SCREEN_IMPORT_FROM_SEED_BUTTON_ID,
} from '../testIDs/Screens/WalletSetupScreen.testIds';
import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';

class OnBoardingScreen {
  // selectors ====================================
  get title() {
    return Selectors.getXpathElementByText('Wallet setup');
  }

  get description() {
    return Selectors.getXpathElementByResourceId(
      WALLET_SETUP_SCREEN_DESCRIPTION_ID,
    );
  }

  get seedButton() {
    return Selectors.getXpathElementByResourceId(
      WALLET_SETUP_SCREEN_IMPORT_FROM_SEED_BUTTON_ID,
    );
  }

  get createNewWalletButton() {
    return Selectors.getXpathElementByResourceId(
      WALLET_SETUP_CREATE_NEW_WALLET_BUTTON_ID,
    );
  }

  get termsAndConditionsButton() {
    return Selectors.getXpathElementByResourceId(
      TERMS_AND_CONDITIONS_BUTTON_ID,
    );
  }

  get importWalletButton() {
    return `~wallet-setup-screen-import-from-seed-button-id`;
  }
  get newWalletButton() {
    return Selectors.getXpathByContentDesc(
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
    await Gestures.tapTextByXpath('Import using Secret Recovery Phrase'); // TO DISMISS KEYBOARD
  }

  async tapCreateNewWalletButton() {
    await Gestures.tapTextByXpath('Create a new wallet'); // TO DISMISS KEYBOARD
  }
}

export default new OnBoardingScreen();
