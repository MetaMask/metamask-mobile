import {
  ANDROID_CONFIRM_PASSWORD_INPUT_FIRST_FIELD,
  ANDROID_CREATE_PASSWORD_INPUT_FIRST_FIELD,
  I_UNDERSTAND_BUTTON_ID,
  PROTECT_YOUR_WALLET_CONTAINER_ID,
  REMIND_LATER_BUTTON_ID,
  SUBMIT_BUTTON,
  WALLET_SETUP_SCREEN_DESCRIPTION_ID,
} from '../testIDs/Screens/WalletSetupScreen.testIds';
import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';

class CreateNewWalletScreen {
  get description() {
    return Selectors.getXpathElementByResourceId(
      WALLET_SETUP_SCREEN_DESCRIPTION_ID,
    );
  }

  get secureWalletScreen() {
    return Selectors.getXpathElementByResourceId(
      PROTECT_YOUR_WALLET_CONTAINER_ID,
    );
  }

  get remindMeLaterButton() {
    return Selectors.getXpathElementByResourceId(REMIND_LATER_BUTTON_ID);
  }

  get newWalletPasswordField() {
    return Selectors.getXpathElementByResourceId(
      ANDROID_CREATE_PASSWORD_INPUT_FIRST_FIELD,
    );
  }

  get newWalletPasswordConfirm() {
    return Selectors.getXpathElementByResourceId(
      ANDROID_CONFIRM_PASSWORD_INPUT_FIRST_FIELD,
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

  async isNewAccountScreenFieldsVisible() {
    await expect(this.newWalletPasswordField).toBeDisplayed();
  }

  async isNotVisible() {
    const secureWalletScreen = await this.secureWalletScreen;
    await secureWalletScreen.waitForExist({ reverse: true });
  }
}

export default new CreateNewWalletScreen();
