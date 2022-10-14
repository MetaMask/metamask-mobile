import { TERMS_AND_CONDITIONS_BUTTON_ID } from '../testIDs/Components/TermsAndConditions.testIds';
import {
  WALLET_SETUP_CREATE_NEW_WALLET_BUTTON_ID,
  WALLET_SETUP_SCREEN_DESCRIPTION_ID,
  WALLET_SETUP_SCREEN_IMPORT_FROM_SEED_BUTTON_ID,
  WALLET_SETUP_SCREEN_TITLE_ID,
  I_AGREE_BUTTON,
  CREATE_PASSWORD_INPUT_FIRST_FIELD,
  CONFIRM_PASSWORD_INPUT_FIRST_FIELD,
  TANDC_UNDERSTAND,
  SUBMIT_BUTTON,
  REMIND_LATER_BUTTON,
  SKIP_BACKUP_TEXT,
  SKIP_BUTTON,
  WALLET_WELCOME_BOX
} from '../testIDs/Screens/WalletSetupScreen.testIds';
import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';

export const Input_Phrase = 'fold media south add since false relax immense pause cloth just raven';
export const password = '123454321';
export const createNewPassword = '123454321';
class WalletSetupScreen {

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

  get skipButton() {
    return Selectors.getElementByPlatform(SKIP_BUTTON);
  }

  get newWalletPasswordField() {
    return Selectors.getElementByPlatform(CREATE_PASSWORD_INPUT_FIRST_FIELD);
  }

  get newWalletPasswordConfirm() {
    return Selectors.getElementByPlatform(CONFIRM_PASSWORD_INPUT_FIRST_FIELD);
  }

  get tandCTickBoxField() {
    return Selectors.getElementByPlatform(TANDC_UNDERSTAND);
  }

  get newWalletSubmitBtn() {
    return Selectors.getElementByPlatform(SUBMIT_BUTTON);
  }
  
  get newWalletButton() {
    return Selectors.getElementByPlatform(WALLET_SETUP_CREATE_NEW_WALLET_BUTTON_ID);
  }
  
  get agreeButton() {
    return Selectors.getElementByPlatform(I_AGREE_BUTTON);
  }

  get remindMeLaterBtn() {
    return Selectors.getElementByPlatform(REMIND_LATER_BUTTON);
  }

  get skipBackupText() {
    return Selectors.getElementByPlatform(SKIP_BACKUP_TEXT);
  }
  
  get newWalletWelcomeTutorial() {
    return Selectors.getElementByPlatform(WALLET_WELCOME_BOX);
  }
  
  
// functions and assertions ======================================
  

  async verifyScreenTitle() {
    await expect(this.title).toBeDisplayed();
  }

  async verifyScreenDescription() {
    await expect(this.description).toBeDisplayed();
  }

  async verifyImportWalletButton() {
    await expect(this.seedButton).toBeDisplayed();
  }

  async verifyCreateNewWalletButton() {
    await expect(this.createNewWalletButton).toBeDisplayed();
  }

  async verifyTermsAndConditionsButton() {
    await expect(this.termsAndConditionsButton).toBeDisplayed();
  }

  async clickImportWalletButton() {
    await Gestures.tap(this.importWalletButton);
  }

  async tapCreateNewWalletBtn(){
    await Gestures.tap(this.newWalletButton);
  }

  async tapAgreeDataGathering(){
    await Gestures.tap(this.agreeButton);
 }

 async createPasswordfirstInput() {
  await Gestures.typeText(this.newWalletPasswordField, password)
  await Gestures.typeText(this.newWalletPasswordConfirm, password)
  await Gestures.tap(this.tandCTickBoxField)
  await Gestures.tap(this.newWalletSubmitBtn)
}

async proceedWithoutWalletSecure(){
  await Gestures.tap(this.remindMeLaterBtn)
  await Gestures.tap(this.skipBackupText)
  await Gestures.tap(this.skipButton)
  await expect(this.newWalletWelcomeTutorial).toBeDisplayed()
}
}

export default new WalletSetupScreen();
