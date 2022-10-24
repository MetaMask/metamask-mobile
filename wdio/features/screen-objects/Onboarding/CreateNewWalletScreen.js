import { TERMS_AND_CONDITIONS_BUTTON_ID } from '../../testIDs/Components/TermsAndConditions.testIds';
import {
  WALLET_SETUP_CREATE_NEW_WALLET_BUTTON_ID,
  WALLET_SETUP_SCREEN_DESCRIPTION_ID,
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

class CreateNewWalletScren {

  // selectors ====================================
  get title () {
    return Selectors.getElementByPlatform(WALLET_SETUP_SCREEN_TITLE_ID)
  }

  get description() {
    return Selectors.getElementByPlatform(WALLET_SETUP_SCREEN_DESCRIPTION_ID);
  }

  get termsAndConditionsButton() {
    return Selectors.getElementByPlatform(TERMS_AND_CONDITIONS_BUTTON_ID);
  }

  get secureWalletScreenText() {
    return Selectors.getElementByPlatform(SECURE_WALLET_SCREEN);
  }
  get skipButton() {
    return Selectors.getElementByPlatform(SKIP_BUTTON);
  }
  get skipBackupText() {
    return Selectors.getElementByPlatform(SKIP_BACKUP_TEXT);
  }
  get remindMeLaterButton() {
    return Selectors.getElementByPlatform(REMIND_LATER_BUTTON);
  }

  get newWalletPasswordField() {
    return Selectors.getElementByPlatform(CREATE_PASSWORD_INPUT_FIRST_FIELD);
  }

  get newWalletPasswordConfirm() {
    return Selectors.getElementByPlatform(CONFIRM_PASSWORD_INPUT_FIRST_FIELD);
  }

  get termsAndConditionCheckBox() {
    return Selectors.getElementByPlatform(I_UNDERSTAND_BUTTON_ID);
  }

  get newWalletSubmitButton() {
    return Selectors.getElementByPlatform(SUBMIT_BUTTON);
  }
  
//Create account password and submit 
 async createNewAccountPassword() {
  await Gestures.typeText(this.newWalletPasswordField, password)
  await Gestures.typeText(this.newWalletPasswordConfirm, password)
  await Gestures.tap(this.termsAndConditionCheckBox)
  await Gestures.tap(this.newWalletSubmitButton)
  await this.isAccountCreated()
}
async inputPasswordInFirstField(firstPassword) {
  await Gestures.typeText(this.newWalletPasswordField, firstPassword)
}

async inputConfirmPasswordField(secondPassword) {
  await Gestures.typeText(this.newWalletPasswordConfirm, secondPassword)
  await Gestures.tap(this.termsAndConditionCheckBox)
  await Gestures.tap(this.newWalletSubmitButton)
}

async selectRemindMeLater(){
  await Gestures.tap(this.remindMeLaterButton)
}


async isAccountCreated(){
  await expect(this.remindMeLaterButton).toBeDisplayed();
  await expect(this.secureWalletScreenText).toBeDisplayed();
}
  
async isScreenTitleVisible() {
  await expect(this.title).toBeDisplayed();
}

async isScreenDescriptionVisible() {
  await expect(this.description).toBeDisplayed();
}

async isTermsAndConditionsButtonVisible() {
  await expect(this.termsAndConditionsButton).toBeDisplayed();
}

// Assert password input field for new account
async assertNewAccountScreenFields(){
await expect(this.newWalletPasswordField).toBeDisplayed();
}



}

export default new CreateNewWalletScren();