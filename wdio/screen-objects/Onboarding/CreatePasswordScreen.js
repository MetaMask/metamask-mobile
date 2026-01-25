
import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import { ChoosePasswordSelectorsIDs } from '../../../e2e/selectors/Onboarding/ChoosePassword.selectors';
import AppwrightSelectors from '../../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../../e2e/framework/AppwrightGestures';
import { CONFIRM_PASSWORD_INPUT_FIRST_FIELD, CREATE_PASSWORD_INPUT_FIRST_FIELD } from '../testIDs/Screens/WalletSetupScreen.testIds';
import { expect as appwrightExpect } from 'appwright';

class CreatePasswordScreen {

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;

  }
  
  get container() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(ChoosePasswordSelectorsIDs.CONTAINER_ID);
    } else {
      return AppwrightSelectors.getElementByID(this._device, ChoosePasswordSelectorsIDs.CONTAINER_ID);
    }
  }

  get newPasswordInput() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
    } else {
      if (AppwrightSelectors.isAndroid(this._device)) {
        return AppwrightSelectors.getElementByID(this._device, CREATE_PASSWORD_INPUT_FIRST_FIELD);
      } else {
        return AppwrightSelectors.getElementByXpath(this._device, '(//XCUIElementTypeOther[@name="textfield"])[1]');
      }
    }
  }

  get confirmPasswordInput() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );
    } else {
      if (AppwrightSelectors.isAndroid(this._device)) {
        return AppwrightSelectors.getElementByID(this._device, CONFIRM_PASSWORD_INPUT_FIRST_FIELD);
      } else {
        return AppwrightSelectors.getElementByXpath(this._device, '(//XCUIElementTypeOther[@name="textfield"])[2]');     
      }
    }
  }

  get iUnderstandCheckbox() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
      );
    } else {
      return AppwrightSelectors.getElementByID(this._device, ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID);
    }
  }

  get submitButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );
    } else {
      return AppwrightSelectors.getElementByID(this._device, ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID);
    }
  }

  async enterPassword(password) {
    if (!this._device) {
      await Gestures.setValueWithoutTap(this.newPasswordInput, password);
    } else {
      const element = await this.newPasswordInput;
      await AppwrightGestures.typeText(element, password);
    }
  }

  async reEnterPassword(password) {
    if (!this._device) {
      await Gestures.setValueWithoutTap(this.confirmPasswordInput, password);
    } else {
      const element = await this.confirmPasswordInput;
      await AppwrightGestures.typeText(element, password);
    }
  }

  async tapIUnderstandCheckBox() {
    if (!this._device) {
      await Gestures.waitAndTap(this.iUnderstandCheckbox);
    } else {
        await AppwrightGestures.hideKeyboard(this._device);
        await AppwrightGestures.tap(await this.iUnderstandCheckbox); 
    }
  }

  async tapCreatePasswordButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.submitButton);
    } else {
      await AppwrightGestures.tap(await this.submitButton); 
    }
  }

  async isVisible() {
    const element = await this.newPasswordInput;
    await appwrightExpect(element).toBeVisible({ timeout: 10000 });
  }
}

export default new CreatePasswordScreen();
