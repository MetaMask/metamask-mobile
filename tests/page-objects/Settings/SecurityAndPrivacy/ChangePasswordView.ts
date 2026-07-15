import { ChoosePasswordSelectorsIDs } from '../../../../app/components/Views/ChoosePassword/ChoosePassword.testIds';
import { ChangePasswordViewSelectorsText } from '../../../selectors/Settings/SecurityAndPrivacy/ChangePasswordView.selectors';
import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';
import { EncapsulatedElementType } from '../../../framework';

class ChangePasswordView {
  get title(): EncapsulatedElementType {
    return Matchers.getElementByText(
      ChangePasswordViewSelectorsText.CHANGE_PASSWORD,
    );
  }

  get passwordInput(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
    );
  }

  get confirmPasswordInput(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
    );
  }

  get iUnderstandCheckBox(): EncapsulatedElementType {
    return Matchers.getElementByLabel(
      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
    );
  }

  get submitButton(): EncapsulatedElementType {
    return Matchers.getElementByText(
      ChoosePasswordSelectorsIDs.SAVE_PASSWORD_BUTTON_TEXT,
    );
  }

  async typeInConfirmPasswordInputBox(PASSWORD: string): Promise<void> {
    await Gestures.typeText(this.passwordInput, PASSWORD, {
      hideKeyboard: true,
      elemDescription: 'Confirm password input box',
    });
  }

  async reEnterPassword(PASSWORD: string): Promise<void> {
    await Gestures.typeText(this.confirmPasswordInput, PASSWORD, {
      hideKeyboard: true,
      elemDescription: 'Confirm password input box re-enter',
    });
  }

  async tapIUnderstandCheckBox(): Promise<void> {
    await Gestures.waitAndTap(this.iUnderstandCheckBox, {
      elemDescription: 'I understand checkbox',
    });
  }

  async tapSubmitButton(): Promise<void> {
    await Gestures.waitAndTap(this.submitButton, {
      elemDescription: 'Submit button',
    });
  }
}

export default new ChangePasswordView();
