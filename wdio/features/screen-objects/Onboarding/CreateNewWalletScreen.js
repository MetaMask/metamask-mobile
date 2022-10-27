import { TERMS_AND_CONDITIONS_BUTTON_ID } from '../../testIDs/Components/TermsAndConditions.testIds';
import {
  WALLET_SETUP_SCREEN_DESCRIPTION_ID,
  WALLET_SETUP_SCREEN_TITLE_ID,
  CREATE_PASSWORD_INPUT_FIRST_FIELD,
  CONFIRM_PASSWORD_INPUT_FIRST_FIELD,
  I_UNDERSTAND_BUTTON_ID,
  SUBMIT_BUTTON,
  REMIND_LATER_BUTTON_ID,
  PROTECT_YOUR_WALLET_CONTAINER_ID
} from '../../testIDs/Screens/WalletSetupScreen.testIds';

import {SKIP_BACKUP_TEXT,
  SKIP_BUTTON,} from '../../testIDs/Components/SkipAccountSecurityModalTestIds';
import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';

class CreateNewWalletScren {

  // selectors ====================================
  get title () {
    return Selectors.getElementByPlatform(WALLET_SETUP_SCREEN_TITLE_ID);
  }

  get description() {
    return Selectors.getElementByPlatform(WALLET_SETUP_SCREEN_DESCRIPTION_ID);
  }

  get termsAndConditionsButton() {
    return Selectors.getElementByPlatform(TERMS_AND_CONDITIONS_BUTTON_ID);
  }

  get secureWalletScreen() {
    return Selectors.getElementByPlatform(PROTECT_YOUR_WALLET_CONTAINER_ID);
  }
  get skipButton() {
    return Selectors.getElementByPlatform(SKIP_BUTTON);
  }
  get skipBackupText() {
    return Selectors.getElementByPlatform(SKIP_BACKUP_TEXT);
  }
  get remindMeLaterButton() {
    return Selectors.getElementByPlatform(REMIND_LATER_BUTTON_ID);
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

async inputPasswordInFirstField(firstPassword) {
  await Gestures.typeText(this.newWalletPasswordField, firstPassword);
}

async inputConfirmPasswordField(secondPassword) {
  await Gestures.typeText(this.newWalletPasswordConfirm, secondPassword);
  await Gestures.tap(this.termsAndConditionCheckBox);
  await Gestures.tap(this.newWalletSubmitButton);
}

async selectRemindMeLater(){
  await Gestures.tap(this.remindMeLaterButton);
}

async isAccountCreated(){
  await expect(this.remindMeLaterButton).toBeDisplayed();
  await expect(this.secureWalletScreen).toBeDisplayed();
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

async isNewAccountScreenFieldsVisible(){
await expect(this.newWalletPasswordField).toBeDisplayed();
}

async isNotVisible(){
  await expect(this.SECURE_WALLET_SCREEN).not.toBeDisplayed();

}

}

export default new CreateNewWalletScren();
