import { TERMS_AND_CONDITIONS_BUTTON_ID } from '../testIDs/Components/TermsAndConditions.testIds';
import {
  CONFIRM_PASSWORD_INPUT_FIRST_FIELD,
  CREATE_PASSWORD_INPUT_FIRST_FIELD,
  I_UNDERSTAND_BUTTON_ID,
  PROTECT_YOUR_WALLET_CONTAINER_ID,
  REMIND_LATER_BUTTON_ID,
  SUBMIT_BUTTON,
  WALLET_SETUP_SCREEN_DESCRIPTION_ID,
  WALLET_SETUP_SCREEN_TITLE_ID,
} from '../testIDs/Screens/WalletSetupScreen.testIds';
import { SKIP_BUTTON } from '../testIDs/Components/SkipAccountSecurityModalTestIds';
import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';

class CreateNewWalletScreen {
  // selectors ====================================
  get screenTitle() {
    return Selectors.getXpathElementByResourceId(WALLET_SETUP_SCREEN_TITLE_ID);
  }
  get description() {
    return Selectors.getXpathElementByResourceId(
      WALLET_SETUP_SCREEN_DESCRIPTION_ID,
    );
  }

  get termsAndConditionsButton() {
    return Selectors.getXpathElementByResourceId(
      TERMS_AND_CONDITIONS_BUTTON_ID,
    );
  }

  get secureWalletScreen() {
    return Selectors.getXpathElementByResourceId(
      PROTECT_YOUR_WALLET_CONTAINER_ID,
    );
  }

  get skipButton() {
    return Selectors.getXpathElementByResourceId(SKIP_BUTTON);
  }

  get remindMeLaterButton() {
    return Selectors.getXpathElementByResourceId(REMIND_LATER_BUTTON_ID);
  }

  get newWalletPasswordField() {
    return Selectors.getXpathElementByResourceId(
      CREATE_PASSWORD_INPUT_FIRST_FIELD,
    );
  }

  get newWalletPasswordConfirm() {
    return Selectors.getXpathElementByResourceId(
      CONFIRM_PASSWORD_INPUT_FIRST_FIELD,
    );
  }

  get termsAndConditionCheckBox() {
    return Selectors.getXpathElementByResourceId(I_UNDERSTAND_BUTTON_ID);
  }

  get newWalletSubmitButton() {
    return Selectors.getXpathByContentDesc(SUBMIT_BUTTON);
  }

  async inputPasswordInFirstField(firstPassword) {
    await Gestures.typeText(this.newWalletPasswordField, firstPassword);
  }

  async inputConfirmPasswordField(secondPassword) {
    await Gestures.typeText(this.newWalletPasswordConfirm, secondPassword);
    await driver.hideKeyboard();
    await Gestures.waitAndTap(this.termsAndConditionCheckBox);
    // await Gestures.waitAndTap(this.screenTitle);
    await driver.pause(2500);
    // await Gestures.tap('Create password');
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
