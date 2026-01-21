import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import { I_UNDERSTAND_BUTTON_ID } from './testIDs/Screens/WalletSetupScreen.testIds';
import { ManualBackUpStepsSelectorsIDs } from '../../app/components/Views/ManualBackupStep1/ManualBackUpSteps.testIds';

class ChangePasswordScreens {
  get passwordInput() {
    return Selectors.getElementByPlatform(ManualBackUpStepsSelectorsIDs.CONFIRM_PASSWORD_INPUT);
  }

  get confirmButton() {
    return Selectors.getElementByPlatform(ManualBackUpStepsSelectorsIDs.SUBMIT_BUTTON);
  }

  get termsAndConditionCheckBox() {
    return Selectors.getXpathElementByResourceId(I_UNDERSTAND_BUTTON_ID);
  }

  async typePassword(text) {
    const elem = await this.passwordInput;
    await elem.waitForDisplayed();
    await Gestures.typeText(elem, text);
  }

  async tapConfirmButton() {
    // await Gestures.tap(this.buttonCONFIRM);
    await driver.hideKeyboard();
    await Gestures.waitAndTap(this.confirmButton);
    await Gestures.waitAndTap(this.confirmButton);
  }

  async tapUnderstandTerms() {
    await Gestures.waitAndTap(this.termsAndConditionCheckBox);
  }
}

export default new ChangePasswordScreens();
