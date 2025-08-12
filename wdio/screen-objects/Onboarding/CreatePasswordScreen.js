
import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import { ChoosePasswordSelectorsIDs } from '../../../e2e/selectors/Onboarding/ChoosePassword.selectors';
import AppwrightSelectors from '../../helpers/AppwrightSelectors';
import { CONFIRM_PASSWORD_INPUT_FIRST_FIELD, CREATE_PASSWORD_INPUT_FIRST_FIELD } from '../testIDs/Screens/WalletSetupScreen.testIds';

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
      return AppwrightSelectors.getElementByID(this._device, CREATE_PASSWORD_INPUT_FIRST_FIELD);
    }
  }

  get confirmPasswordInput() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );
    } else {
      return AppwrightSelectors.getElementByID(this._device, CONFIRM_PASSWORD_INPUT_FIRST_FIELD);
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

  get iUnderstandCheckboxNewWallet() {
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
      const element = await this.iUnderstandCheckbox;
      await element.tap();
    }
  }

  async tapCreatePasswordButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.submitButton);
    } else {
      const element = await this.submitButton;
      await element.tap();
    }
  }
}

export default new CreatePasswordScreen();
