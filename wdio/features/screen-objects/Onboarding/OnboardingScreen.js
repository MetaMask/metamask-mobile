import { TERMS_AND_CONDITIONS_BUTTON_ID } from '../../testIDs/Components/TermsAndConditions.testIds';
import {
  WALLET_SETUP_CREATE_NEW_WALLET_BUTTON_ID,
  WALLET_SETUP_SCREEN_DESCRIPTION_ID,
  WALLET_SETUP_SCREEN_IMPORT_FROM_SEED_BUTTON_ID,
  WALLET_SETUP_SCREEN_TITLE_ID,
  I_AGREE_BUTTON,
  CREATE_PASSWORD_INPUT_FIRST_FIELD,
  CONFIRM_PASSWORD_INPUT_FIRST_FIELD,
  I_UNDERSTAND_BUTTON_ID,
  SUBMIT_BUTTON,
  REMIND_LATER_BUTTON,
  SKIP_BACKUP_TEXT,
  SKIP_BUTTON,
} from '../../testIDs/Screens/WalletSetupScreen.testIds';
import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';

export const Input_Phrase = 'fold media south add since false relax immense pause cloth just raven';
export const password = '123454321';
export const createNewPassword = '123454321';
export const SECURE_WALLET_SCREEN = 'protect-your-account-screen';

class OnBoardingScreen {

  // selectors ====================================
  get title () {
    return Selectors.getElementByPlatform(WALLET_SETUP_SCREEN_TITLE_ID)
  }

  get description() {
    return Selectors.getElementByPlatform(WALLET_SETUP_SCREEN_DESCRIPTION_ID);
  }

  get seedButton() {
    return Selectors.getElementByPlatform(WALLET_SETUP_SCREEN_IMPORT_FROM_SEED_BUTTON_ID);
  }

  get createNewWalletButton() {
    return Selectors.getElementByPlatform(WALLET_SETUP_CREATE_NEW_WALLET_BUTTON_ID);
  }

  get termsAndConditionsButton() {
    return Selectors.getElementByPlatform(TERMS_AND_CONDITIONS_BUTTON_ID);
  }

  get importWalletButton() {
    return Selectors.getElementByPlatform(WALLET_SETUP_SCREEN_IMPORT_FROM_SEED_BUTTON_ID);
  }
  get newWalletButton() {
    return Selectors.getElementByPlatform(WALLET_SETUP_CREATE_NEW_WALLET_BUTTON_ID);
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
    await Gestures.tap(this.importWalletButton);
  }

  async tapCreateNewWalletButton(){
    await Gestures.tap(this.newWalletButton);
  }


}

export default new OnBoardingScreen();