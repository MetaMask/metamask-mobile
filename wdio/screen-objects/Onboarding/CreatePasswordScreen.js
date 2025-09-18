
import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import { ChoosePasswordSelectorsIDs } from '../../../e2e/selectors/Onboarding/ChoosePassword.selectors';
import AppwrightSelectors from '../../helpers/AppwrightSelectors';
import AppwrightGestures from '../../../appwright/utils/AppwrightGestures.js';
import { CONFIRM_PASSWORD_INPUT_FIRST_FIELD, CREATE_PASSWORD_INPUT_FIRST_FIELD } from '../testIDs/Screens/WalletSetupScreen.testIds';
import { expect as appwrightExpect } from 'appwright';

class CreatePasswordScreen extends AppwrightGestures {
  constructor() {
    super();
  }

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
    super.device = device; // Set device in parent class too
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
        return AppwrightSelectors.getElementByXpath(this._device, '//XCUIElementTypeOther[@name="textfield" and @label="Enter a strong password"]');
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
        return AppwrightSelectors.getElementByXpath(this._device, '//XCUIElementTypeOther[@name="textfield" and @label="Re-enter your password"]');
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
      await element.fill(password);
    }
  }

  async reEnterPassword(password) {
    if (!this._device) {
      await Gestures.setValueWithoutTap(this.confirmPasswordInput, password);
    } else {
      const element = await this.confirmPasswordInput;
      await element.fill(password);
    }
  }

  async tapIUnderstandCheckBox() {
    if (!this._device) {
      await Gestures.waitAndTap(this.iUnderstandCheckbox);
    } else {
      await this.tap(this.iUnderstandCheckbox); // Use inherited tapElement method with retry logic
    }
  }

  async tapCreatePasswordButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.submitButton);
    } else {
      await this.tap(this.submitButton); // Use inherited tapElement method with retry logic
    }
  }

  async isVisible() {
    const element = await this.newPasswordInput;
    await appwrightExpect(element).toBeVisible({ timeout: 10000 });
  }
}

export default new CreatePasswordScreen();
