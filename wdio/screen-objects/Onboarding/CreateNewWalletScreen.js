import { TERMS_AND_CONDITIONS_BUTTON_ID } from '../testIDs/Components/TermsAndConditions.testIds';
import {
  CONFIRM_PASSWORD_INPUT_FIRST_FIELD,
  CREATE_PASSWORD_INPUT_FIRST_FIELD,
  I_UNDERSTAND_BUTTON_ID,
  PROTECT_YOUR_WALLET_CONTAINER_ID,
  REMIND_LATER_BUTTON_ID,
  SUBMIT_BUTTON,
  WALLET_SETUP_SCREEN_DESCRIPTION_ID,
} from '../testIDs/Screens/WalletSetupScreen.testIds';
import { SKIP_BUTTON } from '../testIDs/Components/SkipAccountSecurityModalTestIds';
import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';

class CreateNewWalletScreen {
  // selectors ====================================
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
    await driver.hideKeyboard();
    await Gestures.waitAndTap(this.termsAndConditionCheckBox);
    await Gestures.waitAndTap(this.newWalletSubmitButton);
  }

  async inputConfirmResetPasswordField(secondPassword) {
    await Gestures.typeText(this.newWalletPasswordConfirm, secondPassword);
    await driver.hideKeyboard();
  }

  async tapSubmitButton() {
    await Gestures.waitAndTap(this.newWalletSubmitButton);
  }

  async tapRemindMeLater() {
    await Gestures.waitAndTap(this.remindMeLaterButton);
  }

  async isAccountCreated() {
    await driver.pause(5000);
    await expect(this.secureWalletScreen).toBeDisplayed();
  }

  async isScreenDescriptionVisible() {
    await expect(this.description).toBeDisplayed();
  }

  async isTermsAndConditionsButtonVisible() {
    await expect(this.termsAndConditionsButton).toBeDisplayed();
  }

  async isNewAccountScreenFieldsVisible() {
    await expect(this.newWalletPasswordField).toBeDisplayed();
  }

  async isNotVisible() {
    const secureWalletScreen = await this.secureWalletScreen;
    await secureWalletScreen.waitForExist({ reverse: true });
  }
}

export default new CreateNewWalletScreen();
