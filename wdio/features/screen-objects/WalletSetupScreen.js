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
export const SECURE_WALLET_SCREEN = 'protect-your-account-screen';

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

  get secureWalletScreenText() {
    return Selectors.getElementByPlatform(SECURE_WALLET_SCREEN);
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
// Assert password input fields for new account
 async assertNewAccountScreenFields(){
  await expect(this.newWalletPasswordField).toBeDisplayed();
  await expect(this.newWalletPasswordConfirm).toBeDisplayed();
  await expect(this.tandCTickBoxField).toBeDisplayed();
  await expect(this.newWalletSubmitBtn).toBeDisplayed();
}
//Create account password and submit 
 async createNewAccountPassword() {
  await Gestures.typeText(this.newWalletPasswordField, password)
  await Gestures.typeText(this.newWalletPasswordConfirm, password)
  await Gestures.tap(this.tandCTickBoxField)
  await Gestures.tap(this.newWalletSubmitBtn)
  await this.accountCreatedAssertion()
}
async inputPasswordInFirstField(firstPassword) {
  await Gestures.typeText(this.newWalletPasswordField, firstPassword)
}

async inputConfirmPasswordField(secondPassword) {
  await Gestures.typeText(this.newWalletPasswordConfirm, secondPassword)
  await Gestures.tap(this.tandCTickBoxField)
  await Gestures.tap(this.newWalletSubmitBtn)
}
// Assert account created and secure your wallet screen visible
async accountCreatedAssertion(){
  await expect(this.remindMeLaterBtn).toBeDisplayed();
  await expect(this.secureWalletScreenText).toBeDisplayed();
}
// function to select remind me later button
async selectRemindMeLater(){
  await Gestures.tap(this.remindMeLaterBtn)
}

async assertSkipSecurityModal(){
  await expect(this.skipBackupText).toBeDisplayed();
}
// Proceed on wallet creation without securing
async proceedWithoutWalletSecure(){
  await Gestures.tap(this.skipBackupText)
  await Gestures.tap(this.skipButton)
  await expect(this.newWalletWelcomeTutorial).toBeDisplayed()
}

async assertNewWalletWelcomeTutorial(){
  await expect(this.newWalletWelcomeTutorial).toBeDisplayed()
}

}

export default new WalletSetupScreen();