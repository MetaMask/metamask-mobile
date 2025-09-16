import { ChoosePasswordSelectorsIDs } from '../../selectors/Onboarding/ChoosePassword.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import enContent from '../../../locales/languages/en.json';
// Import Appwright dependencies for dual compatibility
import AppwrightSelectors from '../../../wdio/helpers/AppwrightSelectors';
import { Device, expect } from 'appwright';

class CreatePasswordView {
  private _device?: Device;

  get device(): Device | undefined {
    return this._device;
  }

  set device(device: Device) {
    this._device = device;
  }

  get container() {
    if (!this._device) {
      // Detox framework
      return Matchers.getElementByID(ChoosePasswordSelectorsIDs.CONTAINER_ID);
    }
      // Appwright framework
      return AppwrightSelectors.getElementByID(
        this._device,
        ChoosePasswordSelectorsIDs.CONTAINER_ID,
      );

  }

  get newPasswordInput() {
    if (!this._device) {
      // Detox framework
      return Matchers.getElementByID(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
    }
      // Appwright framework
      return AppwrightSelectors.getElementByID(
        this._device,
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );

  }

  get confirmPasswordInput() {
    if (!this._device) {
      // Detox framework
      return Matchers.getElementByID(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );
    }
      // Appwright framework
      return AppwrightSelectors.getElementByID(
        this._device,
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );

  }

  get iUnderstandCheckbox() {
    if (!this._device) {
      // Detox framework
      return Matchers.getElementByID(
        ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
      );
    }
      // Appwright framework
      return AppwrightSelectors.getElementByID(
        this._device,
        ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
      );

  }

  get iUnderstandCheckboxNewWallet() {
    if (!this._device) {
      // Detox framework
      return Matchers.getElementByID(
        ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
      );
    }
      // Appwright framework
      return AppwrightSelectors.getElementByID(
        this._device,
        ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
      );

  }

  get submitButton() {
    if (!this._device) {
      // Detox framework
      return Matchers.getElementByID(
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );
    }
      // Appwright framework
      return AppwrightSelectors.getElementByID(
        this._device,
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );

  }

  get passwordError() {
    if (!this._device) {
      // Detox framework
      return Matchers.getElementByText(
        enContent.import_from_seed.password_error,
      );
    }
      // Appwright framework
      return AppwrightSelectors.getElementByText(
        this._device,
        enContent.import_from_seed.password_error,
      );

  }

  async resetPasswordInputs(): Promise<void> {
    if (!this._device) {
      // Detox framework
      await Gestures.typeText(this.newPasswordInput, '', {
        hideKeyboard: true,
      });
      await Gestures.typeText(this.confirmPasswordInput, '', {
        hideKeyboard: true,
      });
    } else {
      // Appwright framework
      const newPasswordInput = await this.newPasswordInput;
      const confirmPasswordInput = await this.confirmPasswordInput;
      await newPasswordInput.clear();
      await confirmPasswordInput.clear();
      await AppwrightSelectors.hideKeyboard(this._device);
    }
  }

  async enterPassword(password: string): Promise<void> {
    if (!this._device) {
      // Detox framework
      await Gestures.typeText(this.newPasswordInput, password, {
        elemDescription: 'Create Password New Password Input',
        hideKeyboard: true,
      });
    } else {
      // Appwright framework
      const input = await this.newPasswordInput;
      await input.fill(password);
      await AppwrightSelectors.hideKeyboard(this._device);
    }
  }

  async reEnterPassword(password: string): Promise<void> {
    if (!this._device) {
      // Detox framework
      await Gestures.typeText(this.confirmPasswordInput, password, {
        elemDescription: 'Create Password Confirm Password Input',
        hideKeyboard: true,
      });
    } else {
      // Appwright framework
      const input = await this.confirmPasswordInput;
      await input.fill(password);
      await AppwrightSelectors.hideKeyboard(this._device);
    }
  }

  async tapIUnderstandCheckBox(): Promise<void> {
    if (!this._device) {
      // Detox framework
      await Gestures.tap(this.iUnderstandCheckbox, {
        elemDescription: 'Create Password - I Understand Checkbox',
      });
    } else {
      // Appwright framework
      const checkbox = await this.iUnderstandCheckbox;
      await checkbox.tap();
    }
  }

  async tapCreatePasswordButton(): Promise<void> {
    if (!this._device) {
      // Detox framework
      await Gestures.waitAndTap(this.submitButton, {
        elemDescription: 'Create Password Submit Button',
      });
    } else {
      // Appwright framework
      const button = await this.submitButton;
      await button.tap();
    }
  }

  async isVisible(): Promise<void> {
    if (this._device) {
      // Appwright framework
      expect(await this.container).toBeVisible({ timeout: 10000 });
    }
  }
}

export default new CreatePasswordView();
