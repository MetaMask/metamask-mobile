import {
  REMIND_LATER_BUTTON_ID,
  WALLET_SETUP_SCREEN_DESCRIPTION_ID,
  PROTECT_YOUR_WALLET_CONTAINER_ID,
  CREATE_PASSWORD_INPUT_FIRST_FIELD,
  CONFIRM_PASSWORD_INPUT_FIRST_FIELD,
  I_UNDERSTAND_BUTTON_ID,
  SUBMIT_BUTTON,
} from '../../wdio/screen-objects/testIDs/Screens/WalletSetupScreen.testIds';
import { CommonScreen } from './CommonScreen';
import { ChoosePasswordSelectorsIDs } from '../../e2e/selectors/Onboarding/ChoosePassword.selectors';

export class CreateNewWalletScreen extends CommonScreen {
  get description() {
    return WALLET_SETUP_SCREEN_DESCRIPTION_ID;
  }

  get secureWalletScreen() {
    return PROTECT_YOUR_WALLET_CONTAINER_ID;
  }

  get remindMeLaterButton() {
    return REMIND_LATER_BUTTON_ID;
  }

  get newWalletPasswordField() {
    return CREATE_PASSWORD_INPUT_FIRST_FIELD;
  }

  get newWalletPasswordConfirm() {
    return CONFIRM_PASSWORD_INPUT_FIRST_FIELD;
  }

  get termsAndConditionCheckBox() {
    return I_UNDERSTAND_BUTTON_ID;
  }

  get newWalletSubmitButton() {
    return SUBMIT_BUTTON;
  }

  get skipBackUpButton() {
    return ChoosePasswordSelectorsIDs.ANDROID_I_UNDERSTAND_BUTTON_ID;
  }

  async inputNewWalletPassword(password) {
    await this.fillInput(this.newWalletPasswordField, password);
  }

  async inputNewWalletPasswordConfirm(password) {
    await this.fillInput(this.newWalletPasswordConfirm, password);
  }

  async tapOnRemindMeLaterButton() {
    await this.tapOnElement(this.remindMeLaterButton);
  }

  async tapOnTermsAndConditionCheckBox() {
    await this.tapOnElement(this.termsAndConditionCheckBox);
  }

  async tapOnNewWalletSubmitButton() {
    await this.tapOnElement(this.newWalletSubmitButton);
  }
}
