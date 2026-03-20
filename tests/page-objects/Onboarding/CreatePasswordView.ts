import { ChoosePasswordSelectorsIDs } from '../../../app/components/Views/ChoosePassword/ChoosePassword.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import enContent from '../../../locales/languages/en.json';

class CreatePasswordView {
  get container(): DetoxElement {
    return Matchers.getElementByID(ChoosePasswordSelectorsIDs.CONTAINER_ID);
  }

  get newPasswordInput(): DetoxElement {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(
          ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
        )
      : Matchers.getElementByLabel(
          ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
        );
  }

  get confirmPasswordInput(): DetoxElement {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(
          ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
        )
      : Matchers.getElementByLabel(
          ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
        );
  }

  get iUnderstandCheckbox(): DetoxElement {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
    );
  }

  get iUnderstandCheckboxNewWallet(): DetoxElement {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
    );
  }

  get submitButton(): DetoxElement {
    return Matchers.getElementByID(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID);
  }

  get passwordError(): DetoxElement {
    return Matchers.getElementByText(enContent.import_from_seed.password_error);
  }

  async resetPasswordInputs(): Promise<void> {
    await Gestures.typeText(this.newPasswordInput, '', {
      hideKeyboard: true,
      clearFirst: true,
      checkVisibility: false,
    });
    await Gestures.typeText(this.confirmPasswordInput, '', {
      hideKeyboard: true,
      clearFirst: true,
      checkVisibility: false,
    });
  }

  async enterPassword(password: string): Promise<void> {
    await Gestures.typeText(this.newPasswordInput, password, {
      elemDescription: 'Create Password New Password Input',
      hideKeyboard: true,
      checkVisibility: false,
      checkEnabled: false,
    });
  }

  async reEnterPassword(password: string): Promise<void> {
    await Gestures.typeText(this.confirmPasswordInput, password, {
      elemDescription: 'Create Password Confirm Password Input',
      hideKeyboard: true,
      checkVisibility: false,
      checkEnabled: false,
    });
  }

  async tapIUnderstandCheckBox(): Promise<void> {
    await Gestures.tap(this.iUnderstandCheckbox, {
      elemDescription: 'Create Password - I Understand Checkbox',
      checkVisibility: false,
    });
  }

  async tapCreatePasswordButton(): Promise<void> {
    await Gestures.waitAndTap(this.submitButton, {
      elemDescription: 'Create Password Submit Button',
      checkVisibility: false,
    });
  }
}

export default new CreatePasswordView();
